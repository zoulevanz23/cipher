import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Optional

DB_DIR = Path.home() / ".vulnchecker"
DB_PATH = DB_DIR / "history.db"


def _get_conn() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def save_scan(user_id: Optional[int], summary: dict, results: list, fixes: list, project_name: str = "") -> int:
    conn = _get_conn()
    sb = summary.get("severity_breakdown", {})
    cursor = conn.execute(
        """
        INSERT INTO scans (timestamp, user_id, project_name, total_packages, vulnerable_packages,
                           total_vulnerabilities, critical, high, medium, low, results_json, fixes_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            datetime.now(UTC).isoformat(),
            user_id,
            project_name,
            summary.get("total_packages", 0),
            summary.get("vulnerable_packages", 0),
            summary.get("total_vulnerabilities", 0),
            sb.get("critical", 0),
            sb.get("high", 0),
            sb.get("medium", 0),
            sb.get("low", 0),
            json.dumps(results),
            json.dumps(fixes),
        ),
    )
    conn.commit()
    scan_id = cursor.lastrowid
    conn.close()
    return scan_id


def get_history(user_id: Optional[int], limit: int = 20) -> list[dict]:
    conn = _get_conn()
    if user_id:
        rows = conn.execute(
            "SELECT * FROM scans WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM scans WHERE user_id IS NULL ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_scan(scan_id: int, user_id: Optional[int] = None) -> Optional[dict]:
    conn = _get_conn()
    if user_id:
        row = conn.execute("SELECT * FROM scans WHERE id = ? AND user_id = ?", (scan_id, user_id)).fetchone()
    else:
        row = conn.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_scan_stats(user_id: Optional[int]) -> dict:
    conn = _get_conn()
    if user_id:
        row = conn.execute(
            "SELECT COUNT(*) as count, SUM(total_vulnerabilities) as total_vulns FROM scans WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT COUNT(*) as count, SUM(total_vulnerabilities) as total_vulns FROM scans WHERE user_id IS NULL"
        ).fetchone()
    conn.close()
    return dict(row) if row else {"count": 0, "total_vulns": 0}
