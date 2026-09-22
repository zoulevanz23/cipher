import json
import os
import re
import secrets
import sqlite3
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

import bcrypt
import jwt

DB_DIR = Path.home() / ".vulnchecker"
DB_PATH = DB_DIR / "history.db"
JWT_SECRET_FILE = DB_DIR / "jwt_secret"

def _load_jwt_secret() -> str:
    env = os.getenv("CIPHER_JWT_SECRET")
    if env and len(env) >= 16:
        return env
    DB_DIR.mkdir(parents=True, exist_ok=True)
    if JWT_SECRET_FILE.exists():
        try:
            s = JWT_SECRET_FILE.read_text(encoding="utf-8").strip()
            if len(s) >= 16:
                return s
        except Exception:
            pass
    s = secrets.token_hex(32)
    try:
        JWT_SECRET_FILE.write_text(s, encoding="utf-8")
    except Exception:
        pass
    return s

JWT_SECRET = _load_jwt_secret()
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24
CREDITS_LIMIT = 5
CREDITS_RESET_HOURS = 24

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# simple in-memory rate limiter: key -> list[timestamps]
_rate_buckets: dict[str, list[float]] = {}

def check_rate_limit(key: str, limit: int, window_sec: int) -> bool:
    now = time.time()
    arr = _rate_buckets.get(key, [])
    arr = [t for t in arr if now - t < window_sec]
    if len(arr) >= limit:
        _rate_buckets[key] = arr
        return False
    arr.append(now)
    _rate_buckets[key] = arr
    return True

def validate_email(email: str) -> bool:
    return bool(EMAIL_RE.match(email)) and len(email) <= 254

def validate_password(password: str) -> str | None:
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if len(password) > 128:
        return "Password too long"
    if password.lower() in {"password", "12345678", "qwerty123", "letmein"}:
        return "Password too common"
    return None


def _get_conn() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _init_tables() -> None:
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            credits INTEGER DEFAULT 0,
            credits_updated_at TEXT,
            is_anonymous INTEGER DEFAULT 0,
            last_scan_at TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            user_id INTEGER,
            project_name TEXT DEFAULT '',
            total_packages INTEGER DEFAULT 0,
            vulnerable_packages INTEGER DEFAULT 0,
            total_vulnerabilities INTEGER DEFAULT 0,
            critical INTEGER DEFAULT 0,
            high INTEGER DEFAULT 0,
            medium INTEGER DEFAULT 0,
            low INTEGER DEFAULT 0,
            results_json TEXT DEFAULT '[]',
            fixes_json TEXT DEFAULT '[]',
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.commit()
    conn.close()


_init_tables()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_user(email: str, password: str) -> int:
    conn = _get_conn()
    password_hash = hash_password(password)
    now = datetime.now(timezone.utc).isoformat()
    cursor = conn.execute(
        "INSERT INTO users (email, password_hash, created_at, credits, credits_updated_at) VALUES (?, ?, ?, 0, ?)",
        (email, password_hash, now, now),
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return user_id


def get_user_by_email(email: str) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user(user_id: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_anonymous() -> int:
    """Create a fresh anonymous user — each VS Code install gets its own credits."""
    conn = _get_conn()
    now = datetime.now(timezone.utc).isoformat()
    anon_id = secrets.token_hex(4)
    cursor = conn.execute(
        "INSERT INTO users (email, password_hash, created_at, credits, credits_updated_at, is_anonymous) VALUES (?, ?, ?, ?, ?, 1)",
        (f"anon_{anon_id}", "bcrypt$2b$12$placeholder", now, CREDITS_LIMIT, now),
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return user_id


# backwards compat — old extension versions still call this
def get_or_create_anonymous() -> tuple[int, bool]:
    return create_anonymous(), True


def generate_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def check_and_consume_credits(user_id: int) -> tuple[bool, int]:
    """Returns (allowed, credits_remaining)."""
    conn = _get_conn()
    row = conn.execute(
        "SELECT credits, credits_updated_at FROM users WHERE id = ?", (user_id,)
    ).fetchone()

    if not row:
        conn.close()
        return False, 0

    credits = row["credits"]
    credits_updated_at = row["credits_updated_at"]

    if credits_updated_at:
        last_update = datetime.fromisoformat(credits_updated_at)
        if last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - last_update >= timedelta(hours=CREDITS_RESET_HOURS):
            credits = CREDITS_LIMIT
            conn.execute(
                "UPDATE users SET credits = ?, credits_updated_at = ? WHERE id = ?",
                (CREDITS_LIMIT, datetime.now(timezone.utc).isoformat(), user_id),
            )
            conn.commit()

    if credits <= 0:
        conn.close()
        return False, 0

    conn.execute(
        "UPDATE users SET credits = credits - 1, last_scan_at = ? WHERE id = ?",
        (datetime.now(timezone.utc).isoformat(), user_id),
    )
    conn.commit()
    conn.close()
    return True, credits - 1


def generate_login_token(email: str, password: str) -> Optional[str]:
    user = get_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        return None
    return generate_token(user["id"])


def change_password(user_id: int, old_password: str, new_password: str) -> tuple[bool, str]:
    """Change a user's password. Returns (ok, message)."""
    user = get_user(user_id)
    if not user:
        return False, "User not found"
    if user.get("is_anonymous"):
        return False, "Anonymous accounts have no password"
    if not verify_password(old_password, user["password_hash"]):
        return False, "Current password is incorrect"
    pw_err = validate_password(new_password)
    if pw_err:
        return False, pw_err
    conn = _get_conn()
    conn.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (hash_password(new_password), user_id),
    )
    conn.commit()
    conn.close()
    return True, "Password updated"


def delete_user(user_id: int) -> bool:
    """Delete a user and their scan history."""
    conn = _get_conn()
    conn.execute("DELETE FROM scans WHERE user_id = ?", (user_id,))
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True


def get_credits_status(user_id: int) -> dict:
    conn = _get_conn()
    row = conn.execute(
        "SELECT credits, credits_updated_at FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    conn.close()
    if not row:
        return {"credits": 0, "reset_in_hours": 0}

    credits = row["credits"]
    credits_updated_at = row["credits_updated_at"]

    if credits_updated_at:
        last_update = datetime.fromisoformat(credits_updated_at)
        if last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)
        hours_passed = (datetime.now(timezone.utc) - last_update).total_seconds() / 3600
        reset_in = max(0, CREDITS_RESET_HOURS - hours_passed)
        if hours_passed >= CREDITS_RESET_HOURS:
            reset_in = 0
            credits = CREDITS_LIMIT
    else:
        reset_in = 0

    return {"credits": credits, "reset_in_hours": round(reset_in, 1)}


