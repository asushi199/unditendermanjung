import asyncio
import json
import shutil
import sqlite3
from datetime import datetime, timezone
from typing import AsyncGenerator

from config import (
    ADMIN_PIN,
    BACKUPS_DIR,
    DB_PATH,
    EVENT_HEADLINE,
    EVENT_ORG,
    EVENT_SUBHEADLINE,
    EVENT_TITLE,
)
from database import (
    db_transaction,
    format_draw_number,
    total_companies,
    get_connection,
    log_audit,
    parse_draw_number,
    registration_count,
    format_datetime_myt,
    malaysia_now,
)

# SSE subscribers
_subscribers: list[asyncio.Queue] = []
_main_loop: asyncio.AbstractEventLoop | None = None


def set_event_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _main_loop
    _main_loop = loop


def schedule_broadcast() -> None:
    if _main_loop is None:
        return
    asyncio.run_coroutine_threadsafe(broadcast_state(), _main_loop)


def get_event_meta() -> dict:
    return {
        "org": EVENT_ORG,
        "headline": EVENT_HEADLINE,
        "subheadline": EVENT_SUBHEADLINE,
        "tagline": EVENT_TITLE,
    }


def _session_snapshot(conn) -> dict:
    row = conn.execute("SELECT * FROM draw_session WHERE id = 1").fetchone()
    project = None
    company = None
    if row["current_project_id"]:
        p = conn.execute(
            "SELECT * FROM projects WHERE id = ?", (row["current_project_id"],)
        ).fetchone()
        if p:
            project = {
                "id": p["id"],
                "bil": p["bil"],
                "kod_sekolah": p["kod_sekolah"],
                "school": p["school"],
                "title": p["title"],
                "amount_display": p["amount_display"],
            }
    if row["winning_company_id"]:
        c = conn.execute(
            "SELECT id, name FROM companies WHERE id = ?", (row["winning_company_id"],)
        ).fetchone()
        if c:
            company = {"id": c["id"], "name": c["name"]}
    return {
        "phase": row["phase"],
        "project": project,
        "winning_draw_number": (
            format_draw_number(row["winning_draw_number"])
            if row["winning_draw_number"]
            else None
        ),
        "winning_company": company,
    }


async def broadcast_state():
    conn = get_connection()
    try:
        payload = {"type": "state", "data": _session_snapshot(conn)}
        payload["data"]["registration_count"] = registration_count(conn)
        payload["data"]["total_companies"] = total_companies(conn)
        payload["data"]["unlimited_numbers"] = True
        payload["data"]["event"] = get_event_meta()
    finally:
        conn.close()
    msg = json.dumps(payload, ensure_ascii=False)
    dead = []
    for q in _subscribers:
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        _subscribers.remove(q)


def get_public_state() -> dict:
    conn = get_connection()
    try:
        data = _session_snapshot(conn)
        data["registration_count"] = registration_count(conn)
        data["total_companies"] = total_companies(conn)
        data["unlimited_numbers"] = True
        data["event"] = get_event_meta()
        return data
    finally:
        conn.close()


def _normalize_company_name(name: str) -> str:
    return " ".join(name.split())


def create_company(
    name: str,
    pin: str,
    grade: str = "",
    state: str = "",
    district: str = "",
) -> dict:
    if pin != ADMIN_PIN:
        raise PermissionError("PIN tidak sah.")
    clean = _normalize_company_name(name)
    if len(clean) < 3:
        raise ValueError("Nama syarikat terlalu pendek (min. 3 aksara).")

    with db_transaction(immediate=True) as conn:
        dup = conn.execute(
            "SELECT id, name FROM companies WHERE LOWER(name) = LOWER(?)",
            (clean,),
        ).fetchone()
        if dup:
            raise ValueError(f"Syarikat sudah wujud: {dup['name']}")

        cur = conn.execute(
            """INSERT INTO companies (csv_no, name, grade, state, district)
               VALUES (NULL, ?, ?, ?, ?)""",
            (clean, grade.strip(), state.strip(), district.strip()),
        )
        company_id = cur.lastrowid
        log_audit(conn, "company_added", f"id={company_id} name={clean}")

    return {
        "id": company_id,
        "name": clean,
        "grade": grade.strip(),
        "state": state.strip(),
        "district": district.strip(),
        "source": "manual",
    }


def inspect_companies(query: str = "", limit: int = 80) -> list[dict]:
    conn = get_connection()
    try:
        q = query.strip()
        if q:
            pattern = f"%{q}%"
            rows = conn.execute(
                """SELECT c.id, c.csv_no, c.name, c.grade, c.state, c.district,
                          CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END AS registered,
                          r.draw_number, r.counter_id, r.registered_at
                   FROM companies c
                   LEFT JOIN registrations r ON r.company_id = c.id
                   WHERE c.name LIKE ? OR c.grade LIKE ? OR c.state LIKE ?
                         OR c.district LIKE ? OR CAST(c.csv_no AS TEXT) LIKE ?
                   ORDER BY c.name
                   LIMIT ?""",
                (pattern, pattern, pattern, pattern, pattern, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT c.id, c.csv_no, c.name, c.grade, c.state, c.district,
                          CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END AS registered,
                          r.draw_number, r.counter_id, r.registered_at
                   FROM companies c
                   LEFT JOIN registrations r ON r.company_id = c.id
                   ORDER BY c.name
                   LIMIT ?""",
                (limit,),
            ).fetchall()
        return [_company_inspect_row(r) for r in rows]
    finally:
        conn.close()


def _company_inspect_row(r: sqlite3.Row) -> dict:
    return {
        "id": r["id"],
        "csv_no": r["csv_no"],
        "name": r["name"],
        "grade": r["grade"] or "",
        "state": r["state"] or "",
        "district": r["district"] or "",
        "registered": bool(r["registered"]),
        "draw_number": (
            format_draw_number(r["draw_number"]) if r["draw_number"] else None
        ),
        "counter_id": r["counter_id"],
        "registered_at": format_datetime_myt(r["registered_at"]) if r["registered_at"] else None,
        "source": "import" if r["csv_no"] is not None else "manual",
    }


def inspect_projects(query: str = "") -> list[dict]:
    conn = get_connection()
    try:
        q = query.strip()
        if q:
            pattern = f"%{q}%"
            rows = conn.execute(
                """SELECT p.*,
                          CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END AS completed,
                          d.draw_number AS result_number,
                          c.name AS result_company
                   FROM projects p
                   LEFT JOIN draw_results d ON d.project_id = p.id
                   LEFT JOIN companies c ON c.id = d.company_id
                   WHERE p.school LIKE ? OR p.kod_sekolah LIKE ? OR p.title LIKE ?
                         OR CAST(p.bil AS TEXT) LIKE ?
                   ORDER BY p.bil""",
                (pattern, pattern, pattern, pattern),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT p.*,
                          CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END AS completed,
                          d.draw_number AS result_number,
                          c.name AS result_company
                   FROM projects p
                   LEFT JOIN draw_results d ON d.project_id = p.id
                   LEFT JOIN companies c ON c.id = d.company_id
                   ORDER BY p.bil"""
            ).fetchall()
        return [
            {
                "id": r["id"],
                "bil": r["bil"],
                "kod_sekolah": r["kod_sekolah"],
                "school": r["school"],
                "title": r["title"],
                "amount_display": r["amount_display"],
                "completed": bool(r["completed"]),
                "result_number": (
                    format_draw_number(r["result_number"])
                    if r["result_number"]
                    else None
                ),
                "result_company": r["result_company"],
            }
            for r in rows
        ]
    finally:
        conn.close()


def search_companies(query: str, limit: int = 20) -> list[dict]:
    conn = get_connection()
    try:
        q = f"%{query.strip()}%"
        rows = conn.execute(
            """SELECT c.id, c.name,
                      CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END AS registered,
                      r.draw_number
               FROM companies c
               LEFT JOIN registrations r ON r.company_id = c.id
               WHERE c.name LIKE ?
               ORDER BY c.name
               LIMIT ?""",
            (q, limit),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "registered": bool(r["registered"]),
                "draw_number": (
                    format_draw_number(r["draw_number"]) if r["draw_number"] else None
                ),
            }
            for r in rows
        ]
    finally:
        conn.close()


def register_company(company_id: int, counter_id: int) -> dict:
    try:
        return _register_company_tx(company_id, counter_id)
    except sqlite3.IntegrityError:
        raise ValueError(
            "Syarikat ini telah berdaftar. Nombor undian telah diberikan."
        )


def _register_company_tx(company_id: int, counter_id: int) -> dict:
    with db_transaction(immediate=True) as conn:
        existing = conn.execute(
            "SELECT draw_number FROM registrations WHERE company_id = ?",
            (company_id,),
        ).fetchone()
        if existing:
            log_audit(
                conn,
                "register_rejected",
                f"company_id={company_id} already={existing['draw_number']}",
                counter_id,
            )
            raise ValueError(
                "Syarikat ini telah berdaftar. Nombor undian telah diberikan."
            )

        seq = conn.execute(
            "SELECT next_value FROM number_sequence WHERE id = 1"
        ).fetchone()
        draw_num = seq["next_value"]

        company = conn.execute(
            "SELECT id, name FROM companies WHERE id = ?", (company_id,)
        ).fetchone()
        if not company:
            raise ValueError("Syarikat tidak dijumpai.")

        now = malaysia_now()
        conn.execute(
            """INSERT INTO registrations (draw_number, company_id, counter_id, registered_at)
               VALUES (?, ?, ?, ?)""",
            (draw_num, company_id, counter_id, now),
        )
        conn.execute(
            "UPDATE number_sequence SET next_value = next_value + 1 WHERE id = 1"
        )
        log_audit(
            conn,
            "register",
            f"draw_number={draw_num} company={company['name']}",
            counter_id,
        )
        result = {
            "draw_number": format_draw_number(draw_num),
            "draw_number_int": draw_num,
            "company_name": company["name"],
            "registered_at": now,
        }
    schedule_broadcast()
    return result


def delete_registration(draw_number_str: str, pin: str) -> dict:
    if pin != ADMIN_PIN:
        raise PermissionError("PIN tidak sah.")
    draw_num = parse_draw_number(draw_number_str)
    with db_transaction(immediate=True) as conn:
        reg = conn.execute(
            """SELECT r.draw_number, r.company_id, c.name
               FROM registrations r
               JOIN companies c ON c.id = r.company_id
               WHERE r.draw_number = ?""",
            (draw_num,),
        ).fetchone()
        if not reg:
            raise ValueError(f"Nombor {format_draw_number(draw_num)} tidak dijumpai.")

        conn.execute("DELETE FROM registrations WHERE draw_number = ?", (draw_num,))
        seq = conn.execute(
            "SELECT next_value FROM number_sequence WHERE id = 1"
        ).fetchone()["next_value"]
        if draw_num == seq - 1:
            conn.execute(
                "UPDATE number_sequence SET next_value = ? WHERE id = 1",
                (draw_num,),
            )
        log_audit(
            conn,
            "register_delete",
            f"draw_number={draw_num} company={reg['name']}",
        )
        freed = reg["name"]
    schedule_broadcast()
    return {
        "ok": True,
        "draw_number": format_draw_number(draw_num),
        "company_name": freed,
        "number_reused": draw_num == seq - 1,
    }


def show_waiting_screen() -> dict:
    with db_transaction() as conn:
        conn.execute(
            """UPDATE draw_session SET
               current_project_id = NULL, phase = 'idle',
               winning_draw_number = NULL, winning_company_id = NULL
               WHERE id = 1"""
        )
        log_audit(conn, "waiting_screen", "display idle")
    schedule_broadcast()
    return get_public_state()


def reveal_project(project_id: int) -> dict:
    with db_transaction() as conn:
        project = conn.execute(
            "SELECT * FROM projects WHERE id = ?", (project_id,)
        ).fetchone()
        if not project:
            raise ValueError("Projek tidak dijumpai.")
        done = conn.execute(
            "SELECT id FROM draw_results WHERE project_id = ?", (project_id,)
        ).fetchone()
        if done:
            raise ValueError("Projek ini telah selesai diundi.")

        conn.execute(
            """UPDATE draw_session SET
               current_project_id = ?, phase = 'project',
               winning_draw_number = NULL, winning_company_id = NULL
               WHERE id = 1""",
            (project_id,),
        )
        log_audit(conn, "reveal_project", f"project_id={project_id} bil={project['bil']}")
    schedule_broadcast()
    return get_public_state()


def submit_winner(draw_number_str: str) -> dict:
    draw_num = parse_draw_number(draw_number_str)
    if draw_num < 1:
        raise ValueError("Nombor undian tidak sah.")

    with db_transaction(immediate=True) as conn:
        session = conn.execute("SELECT * FROM draw_session WHERE id = 1").fetchone()
        if session["phase"] not in ("project", "winner"):
            raise ValueError("Sila tayangkan projek terlebih dahulu.")
        if not session["current_project_id"]:
            raise ValueError("Tiada projek aktif.")

        reg = conn.execute(
            """SELECT r.draw_number, r.company_id, c.name
               FROM registrations r
               JOIN companies c ON c.id = r.company_id
               WHERE r.draw_number = ?""",
            (draw_num,),
        ).fetchone()
        if not reg:
            log_audit(conn, "winner_rejected", f"unregistered number={draw_num}")
            raise ValueError(
                f"Nombor {format_draw_number(draw_num)} belum didaftarkan."
            )

        revising = session["phase"] == "winner"
        conn.execute(
            """UPDATE draw_session SET
               phase = 'winner',
               winning_draw_number = ?,
               winning_company_id = ?
               WHERE id = 1""",
            (draw_num, reg["company_id"]),
        )
        log_audit(
            conn,
            "winner_revised" if revising else "winner",
            f"project_id={session['current_project_id']} number={draw_num} company={reg['name']}",
        )
    schedule_broadcast()
    return get_public_state()


def next_project() -> dict:
    with db_transaction(immediate=True) as conn:
        session = conn.execute("SELECT * FROM draw_session WHERE id = 1").fetchone()
        if session["phase"] != "winner":
            raise ValueError("Sila masukkan nombor pemenang terlebih dahulu.")
        if not session["current_project_id"] or not session["winning_draw_number"]:
            raise ValueError("Sesi tidak lengkap.")

        conn.execute(
            """INSERT INTO draw_results (project_id, draw_number, company_id, completed_at)
               VALUES (?, ?, ?, ?)""",
            (
                session["current_project_id"],
                session["winning_draw_number"],
                session["winning_company_id"],
                malaysia_now(),
            ),
        )
        conn.execute(
            """UPDATE draw_session SET
               current_project_id = NULL, phase = 'idle',
               winning_draw_number = NULL, winning_company_id = NULL
               WHERE id = 1"""
        )
        log_audit(
            conn,
            "next_project",
            f"saved project_id={session['current_project_id']}",
        )
    schedule_broadcast()
    return get_public_state()


def list_projects() -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT p.*,
                      CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END AS completed,
                      d.draw_number AS result_number,
                      c.name AS result_company
               FROM projects p
               LEFT JOIN draw_results d ON d.project_id = p.id
               LEFT JOIN companies c ON c.id = d.company_id
               ORDER BY p.bil"""
        ).fetchall()
        return [
            {
                "id": r["id"],
                "bil": r["bil"],
                "kod_sekolah": r["kod_sekolah"],
                "school": r["school"],
                "title": r["title"],
                "amount_display": r["amount_display"],
                "completed": bool(r["completed"]),
                "result_number": (
                    format_draw_number(r["result_number"])
                    if r["result_number"]
                    else None
                ),
                "result_company": r["result_company"],
            }
            for r in rows
        ]
    finally:
        conn.close()


def list_registrations() -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT r.draw_number, r.counter_id, r.registered_at, c.name
               FROM registrations r
               JOIN companies c ON c.id = r.company_id
               ORDER BY r.draw_number"""
        ).fetchall()
        return [
            {
                "draw_number": format_draw_number(r["draw_number"]),
                "counter_id": r["counter_id"],
                "registered_at": format_datetime_myt(r["registered_at"]),
                "company_name": r["name"],
            }
            for r in rows
        ]
    finally:
        conn.close()


def stats() -> dict:
    conn = get_connection()
    try:
        n = registration_count(conn)
        next_val = conn.execute(
            "SELECT next_value FROM number_sequence WHERE id = 1"
        ).fetchone()["next_value"]
        n_projects_done = conn.execute("SELECT COUNT(*) FROM draw_results").fetchone()[0]
        n_companies = conn.execute("SELECT COUNT(*) FROM companies").fetchone()[0]
        n_projects = conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
        return {
            "registration_count": n,
            "next_number": format_draw_number(next_val),
            "projects_completed": n_projects_done,
            "total_projects": n_projects,
            "total_companies": n_companies,
            "unlimited_numbers": True,
        }
    finally:
        conn.close()


def reset_rehearsal() -> None:
    with db_transaction() as conn:
        conn.execute(
            """UPDATE draw_session SET
               current_project_id = NULL, phase = 'idle',
               winning_draw_number = NULL, winning_company_id = NULL
               WHERE id = 1"""
        )
        conn.execute("DELETE FROM draw_results")
        conn.execute("DELETE FROM registrations")
        conn.execute("DELETE FROM audit_log")
        conn.execute("UPDATE number_sequence SET next_value = 1 WHERE id = 1")
        log_audit(conn, "rehearsal_reset", "all registrations cleared")
    schedule_broadcast()


def backup_db() -> str:
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    ts = malaysia_now().replace("-", "").replace(":", "").replace(" ", "_")
    dest = BACKUPS_DIR / f"undi_{ts}.db"
    shutil.copy2(DB_PATH, dest)
    return str(dest)


async def event_stream() -> AsyncGenerator[str, None]:
    q: asyncio.Queue = asyncio.Queue(maxsize=32)
    _subscribers.append(q)
    try:
        yield f"data: {json.dumps({'type': 'state', 'data': get_public_state()}, ensure_ascii=False)}\n\n"
        while True:
            try:
                msg = await asyncio.wait_for(q.get(), timeout=25.0)
                yield f"data: {msg}\n\n"
            except asyncio.TimeoutError:
                yield ": keepalive\n\n"
    finally:
        if q in _subscribers:
            _subscribers.remove(q)
