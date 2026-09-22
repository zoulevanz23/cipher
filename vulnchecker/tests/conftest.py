import pytest
import tempfile
import sqlite3
from pathlib import Path

@pytest.fixture
def temp_db():
    """Create a temporary database for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.db"
        conn = sqlite3.connect(str(db_path))
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
        yield db_path
        conn.close()
