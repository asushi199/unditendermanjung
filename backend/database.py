import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

from config import DB_PATH

# Paparan: minimum 3 digit; 1000+ tanpa had kuota
MIN_DRAW_NUMBER_DIGITS = 3

SCHEMA = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY,
    csv_no INTEGER,
    name TEXT NOT NULL UNIQUE,
    grade TEXT,
    state TEXT,
    district TEXT
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    bil INTEGER NOT NULL UNIQUE,
    kod_sekolah TEXT,
    school TEXT NOT NULL,
    title TEXT NOT NULL,
    amount_display TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS number_sequence (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    next_value INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_number INTEGER NOT NULL UNIQUE,
    company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id),
    counter_id INTEGER NOT NULL CHECK (counter_id BETWEEN 1 AND 4),
    registered_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS draw_session (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_project_id INTEGER REFERENCES projects(id),
    phase TEXT NOT NULL DEFAULT 'idle' CHECK (phase IN ('idle', 'project', 'winner')),
    winning_draw_number INTEGER,
    winning_company_id INTEGER
);

CREATE TABLE IF NOT EXISTS draw_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    draw_number INTEGER NOT NULL,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    completed_at TEXT NOT NULL,
    UNIQUE(project_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    details TEXT,
    counter_id INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO number_sequence (id, next_value) VALUES (1, 1);
INSERT OR IGNORE INTO draw_session (id, phase) VALUES (1, 'idle');
INSERT OR IGNORE INTO settings (key, value) VALUES ('rehearsal_mode', '0');

CREATE TABLE IF NOT EXISTS reserve_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot INTEGER NOT NULL UNIQUE,
    draw_number INTEGER NOT NULL,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    completed_at TEXT NOT NULL
);
"""


# Waktu Malaysia (UTC+8, tiada DST)
MALAYSIA_TZ = timezone(timedelta(hours=8))


def malaysia_now() -> str:
    """Simpan & papar masa tempatan Malaysia."""
    return datetime.now(MALAYSIA_TZ).strftime("%Y-%m-%d %H:%M:%S")


def format_datetime_myt(value: str | None) -> str:
    """Tukar ISO UTC lama ke MYT; rekod baru (YYYY-MM-DD HH:MM:SS) kekal."""
    if not value:
        return ""
    raw = value.strip()
    try:
        if "T" in raw or raw.endswith("Z") or "+" in raw[10:]:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(MALAYSIA_TZ).strftime("%Y-%m-%d %H:%M:%S")
        return raw[:19] if len(raw) >= 19 else raw
    except ValueError:
        return raw


def utc_now() -> str:
    """Alias — kekal untuk skrip lama; guna masa Malaysia."""
    return malaysia_now()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _migrate_schema(conn: sqlite3.Connection) -> None:
    cols = {r[1] for r in conn.execute("PRAGMA table_info(draw_session)").fetchall()}
    if "current_reserve_slot" not in cols:
        conn.execute("ALTER TABLE draw_session ADD COLUMN current_reserve_slot INTEGER")


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.executescript(SCHEMA)
        _migrate_schema(conn)
        conn.commit()


@contextmanager
def db_transaction(immediate: bool = False):
    conn = get_connection()
    try:
        if immediate:
            conn.execute("BEGIN IMMEDIATE")
        else:
            conn.execute("BEGIN")
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def log_audit(conn: sqlite3.Connection, action: str, details: str = "", counter_id: int | None = None):
    conn.execute(
        "INSERT INTO audit_log (action, details, counter_id, created_at) VALUES (?, ?, ?, ?)",
        (action, details, counter_id, malaysia_now()),
    )


def format_draw_number(n: int) -> str:
    if n < 1000:
        return f"{n:03d}"
    return str(n)


def parse_draw_number(s: str) -> int:
    s = s.strip().lstrip("0") or "0"
    return int(s)


def registration_count(conn: sqlite3.Connection) -> int:
    row = conn.execute("SELECT COUNT(*) AS c FROM registrations").fetchone()
    return row["c"]


def total_companies(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) AS c FROM companies").fetchone()["c"]


def next_draw_number_available(conn: sqlite3.Connection) -> int:
    row = conn.execute("SELECT next_value FROM number_sequence WHERE id = 1").fetchone()
    return row["next_value"]
