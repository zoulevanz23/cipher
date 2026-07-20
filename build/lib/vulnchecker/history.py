import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

DB_DIR = Path.home() / ".vulnchecker"
DB_PATH = DB_DIR / "history.db"


def _get_conn() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            project_name TEXT DEFAULT '',
            total_packages INTEGER DEFAULT 0,
            vulnerable_packages INTEGER DEFAULT 0,
            total_vulnerabilities INTEGER DEFAULT 0,
            critical INTEGER DEFAULT 0,
            high INTEGER DEFAULT 0,
            medium INTEGER DEFAULT 0,
            low INTEGER DEFAULT 0,
            results_json TEXT DEFAULT '[]',
            fixes_json TEXT DEFAULT '[]'
        )
    """)
    conn.row_factory = sqlite3.Row
    return conn


def save_scan(summary: dict, results: list, fixes: list, project_name: str = "") -> int:
    conn = _get_conn()
    sb = summary.get("severity_breakdown", {})
    cursor = conn.execute(
        """
        INSERT INTO scans (timestamp, project_name, total_packages, vulnerable_packages,
                           total_vulnerabilities, critical, high, medium, low, results_json, fixes_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            datetime.utcnow().isoformat(),
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


def get_history(limit: int = 20) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM scans ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_scan(scan_id: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)).fetchone()
    conn.close()
    return dict(row) if row else None
