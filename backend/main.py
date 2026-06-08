import asyncio
import csv
import io
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from config import RESERVE_SLOTS, STATIC_DIR
from database import format_datetime_myt, format_draw_number, get_connection, init_db
from services import (
    backup_db,
    create_company,
    event_stream,
    get_event_meta,
    get_public_state,
    set_event_loop,
    inspect_companies,
    inspect_projects,
    list_projects,
    list_registrations,
    list_reserves,
    next_project,
    reveal_reserve,
    delete_registration,
    register_company,
    reset_rehearsal,
    reveal_project,
    show_waiting_screen,
    search_companies,
    stats,
    submit_winner,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    set_event_loop(asyncio.get_running_loop())
    backup_task = asyncio.create_task(_periodic_backup())
    yield
    backup_task.cancel()
    try:
        await backup_task
    except asyncio.CancelledError:
        pass


async def _periodic_backup():
    while True:
        await asyncio.sleep(600)
        try:
            backup_db()
        except Exception:
            pass


app = FastAPI(title="UndiTender", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterBody(BaseModel):
    company_id: int
    counter_id: int = Field(ge=1, le=4)


class PinBody(BaseModel):
    pin: str


class ResetRehearsalBody(BaseModel):
    password: str


class RevealBody(BaseModel):
    project_id: int


class RevealReserveBody(BaseModel):
    slot: int = Field(ge=1, le=RESERVE_SLOTS)


class WinnerBody(BaseModel):
    draw_number: str


class DeleteRegistrationBody(BaseModel):
    draw_number: str
    pin: str


class CreateCompanyBody(BaseModel):
    name: str = Field(min_length=3, max_length=500)
    pin: str
    grade: str = ""
    state: str = ""
    district: str = ""


@app.get("/health")
def health():
    return {"status": "ok", **get_event_meta()}


@app.get("/api/event")
def api_event():
    return get_event_meta()


@app.get("/api/stats")
def api_stats():
    return stats()


@app.get("/api/state")
def api_state():
    return JSONResponse(
        content=get_public_state(),
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
        },
    )


@app.get("/api/companies/search")
def api_search(q: str = Query("", min_length=0), limit: int = 20):
    if len(q.strip()) < 2:
        return []
    return search_companies(q, limit)


@app.get("/api/companies/inspect")
def api_inspect_companies(q: str = Query(""), limit: int = Query(80, ge=1, le=200)):
    return inspect_companies(q, limit)


@app.get("/api/projects/inspect")
def api_inspect_projects(q: str = Query("")):
    return inspect_projects(q)


@app.post("/api/companies")
def api_create_company(body: CreateCompanyBody):
    try:
        return create_company(
            body.name, body.pin, body.grade, body.state, body.district
        )
    except PermissionError as e:
        raise HTTPException(403, detail=str(e))
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@app.post("/api/register")
def api_register(body: RegisterBody):
    try:
        result = register_company(body.company_id, body.counter_id)
        return result
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@app.post("/api/register/delete")
def api_register_delete(body: DeleteRegistrationBody):
    try:
        return delete_registration(body.draw_number, body.pin)
    except PermissionError as e:
        raise HTTPException(403, detail=str(e))
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@app.get("/api/projects")
def api_projects():
    return list_projects()


@app.get("/api/reserves")
def api_reserves():
    return list_reserves()


@app.post("/api/draw/reveal-reserve")
def api_reveal_reserve(body: RevealReserveBody):
    try:
        return reveal_reserve(body.slot)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@app.post("/api/draw/reveal")
def api_reveal(body: RevealBody):
    try:
        return reveal_project(body.project_id)
    except PermissionError as e:
        raise HTTPException(403, detail=str(e))
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@app.post("/api/draw/winner")
def api_winner(body: WinnerBody):
    try:
        return submit_winner(body.draw_number)
    except PermissionError as e:
        raise HTTPException(403, detail=str(e))
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@app.post("/api/draw/waiting")
def api_waiting():
    return show_waiting_screen()


@app.post("/api/draw/next")
def api_next():
    try:
        return next_project()
    except PermissionError as e:
        raise HTTPException(403, detail=str(e))
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@app.get("/api/registrations")
def api_registrations():
    return list_registrations()


@app.get("/api/draw-results/export")
def export_draw_results():
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT p.bil, p.school, p.amount_display, d.draw_number, c.name, d.completed_at
               FROM draw_results d
               JOIN projects p ON p.id = d.project_id
               JOIN companies c ON c.id = d.company_id
               ORDER BY p.bil"""
        ).fetchall()
        reserves = conn.execute(
            """SELECT r.slot, r.draw_number, c.name, r.completed_at
               FROM reserve_results r
               JOIN companies c ON c.id = r.company_id
               ORDER BY r.slot"""
        ).fetchall()
    finally:
        conn.close()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Bil", "Sekolah", "Peruntukan", "Nombor", "Syarikat", "Tarikh & Masa (MYT)"])
    for r in rows:
        w.writerow(
            [
                r["bil"],
                r["school"],
                r["amount_display"],
                format_draw_number(r["draw_number"]),
                r["name"],
                format_datetime_myt(r["completed_at"]),
            ]
        )
    if reserves:
        w.writerow([])
        w.writerow(["SIMPANAN", "", "", "", "", ""])
        w.writerow(["Slot", "Label", "", "Nombor", "Syarikat", "Tarikh & Masa (MYT)"])
        for r in reserves:
            w.writerow(
                [
                    r["slot"],
                    f"Syarikat Simpanan {r['slot']}",
                    "",
                    format_draw_number(r["draw_number"]),
                    r["name"],
                    format_datetime_myt(r["completed_at"]),
                ]
            )
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=keputusan_undian.csv"},
    )


@app.get("/api/registrations/export")
def export_registrations():
    rows = list_registrations()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Nombor Undian", "Nama Syarikat", "Kaunter", "Tarikh & Masa (MYT)"])
    for r in rows:
        w.writerow([r["draw_number"], r["company_name"], r["counter_id"], r["registered_at"]])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pendaftaran.csv"},
    )


@app.post("/api/admin/reset-rehearsal")
def api_reset(body: ResetRehearsalBody):
    try:
        reset_rehearsal(body.password)
        return {"ok": True}
    except PermissionError as e:
        raise HTTPException(403, detail=str(e))


@app.post("/api/admin/backup")
def api_backup():
    path = backup_db()
    return {"path": path}


@app.get("/api/events/stream")
async def sse_stream():
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


STATIC_ROOT_FILES = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".txt", ".json"}


def _serve_spa():
    if not STATIC_DIR.exists():
        return

    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.middleware("http")
    async def spa_fallback(request: Request, call_next):
        path = request.url.path
        if (
            request.method in ("GET", "HEAD")
            and not path.startswith("/api")
            and not path.startswith("/assets")
            and path not in ("/", "/health")
        ):
            rel = path.lstrip("/")
            fp = STATIC_DIR / rel
            if fp.is_file() and fp.suffix.lower() in STATIC_ROOT_FILES:
                return FileResponse(fp)

        response = await call_next(request)
        if (
            response.status_code == 404
            and request.method == "GET"
            and not request.url.path.startswith("/api")
            and not request.url.path.startswith("/assets")
            and request.url.path != "/health"
        ):
            index = STATIC_DIR / "index.html"
            if index.is_file():
                return FileResponse(index)
        return response

    @app.get("/")
    def spa_root():
        return FileResponse(STATIC_DIR / "index.html")


_serve_spa()
