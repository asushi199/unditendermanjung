"""Import master data from CSV and Excel into undi.db."""
import csv
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from config import CSV_CONTRACTORS, CSV_EXTRA_COMPANIES, DB_PATH, XLSX_PROJECTS  # noqa: E402
from database import get_connection, init_db, malaysia_now  # noqa: E402

EXPECTED_PROJECTS = 44


def format_amount(currency_cell, amount_cell) -> str:
    if amount_cell is None:
        return ""
    try:
        amount = int(float(amount_cell))
    except (TypeError, ValueError):
        amount = amount_cell
    prefix = (currency_cell or "RM").strip()
    return f"{prefix} {amount:,}"


def _row_company_fields(row: dict) -> tuple:
    name = (row.get("NAMA KONTRAKTOR") or row.get("NAMA KONTRAKTOR ") or "").strip()
    if name.startswith('"') and name.endswith('"'):
        name = name[1:-1].strip()
    grade = (row.get(" GRED") or row.get("GRED") or "").strip()
    state = (row.get(" NEGERI") or row.get("NEGERI") or "").strip()
    district = (row.get(" DAERAH") or row.get("DAERAH") or "").strip()
    try:
        csv_no = int(row.get("NO.") or row.get("NO") or 0)
    except ValueError:
        csv_no = None
    return name, csv_no, grade, state, district


def merge_companies_from_csv(conn, path: Path, source_label: str) -> tuple[int, int, list[str]]:
    """Tambah syarikat baharu sahaja (nama unik, tidak ganti yang sedia ada)."""
    errors = []
    added = 0
    skipped = 0
    if not path.exists():
        return 0, 0, [f"Fail tidak dijumpai: {path}"]

    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name, csv_no, grade, state, district = _row_company_fields(row)
            if not name:
                continue
            dup = conn.execute(
                "SELECT id FROM companies WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))",
                (name,),
            ).fetchone()
            if dup:
                skipped += 1
                continue
            try:
                conn.execute(
                    """INSERT INTO companies (csv_no, name, grade, state, district)
                       VALUES (?, ?, ?, ?, ?)""",
                    (csv_no, name, grade, state, district),
                )
                added += 1
            except Exception as e:
                errors.append(f"{name}: {e}")
    return added, skipped, errors


def import_companies_fresh(conn) -> tuple[int, int, list[str]]:
    conn.execute("DELETE FROM companies")
    all_errors = []
    total_added = 0
    total_skipped = 0
    for path in (CSV_CONTRACTORS, CSV_EXTRA_COMPANIES):
        if not path.exists():
            all_errors.append(f"Skip (tiada fail): {path.name}")
            continue
        with open(path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name, csv_no, grade, state, district = _row_company_fields(row)
                if not name:
                    continue
                dup = conn.execute(
                    "SELECT id FROM companies WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))",
                    (name,),
                ).fetchone()
                if dup:
                    total_skipped += 1
                    continue
                conn.execute(
                    """INSERT INTO companies (csv_no, name, grade, state, district)
                       VALUES (?, ?, ?, ?, ?)""",
                    (csv_no, name, grade, state, district),
                )
                total_added += 1
    return total_added, total_skipped, all_errors


def import_projects(conn) -> list[str]:
    errors = []
    conn.execute("DELETE FROM projects")
    wb = openpyxl.load_workbook(XLSX_PROJECTS, read_only=True)
    ws = wb["Table 1"]
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    wb.close()
    for i, row in enumerate(rows, start=2):
        if not row or row[0] is None:
            continue
        bil = int(row[0])
        kod = str(row[1] or "").strip()
        school = str(row[2] or "").strip()
        title = str(row[3] or "").strip()
        amount = format_amount(row[4], row[5])
        if not school:
            errors.append(f"Row {i}: missing school")
        if not title:
            errors.append(f"Row {i}: missing title")
        if not amount:
            errors.append(f"Row {i}: missing amount")
        conn.execute(
            """INSERT INTO projects (bil, kod_sekolah, school, title, amount_display)
               VALUES (?, ?, ?, ?, ?)""",
            (bil, kod, school, title, amount),
        )
    return errors


def reset_registration_state(conn):
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


def main():
    if not CSV_CONTRACTORS.exists():
        print(f"ERROR: Missing {CSV_CONTRACTORS}")
        sys.exit(1)
    if not XLSX_PROJECTS.exists():
        print(f"ERROR: Missing {XLSX_PROJECTS}")
        sys.exit(1)

    init_db()
    conn = get_connection()
    try:
        reset_registration_state(conn)
        added, skipped_dup, company_errors = import_companies_fresh(conn)
        project_errors = import_projects(conn)
        conn.commit()

        n_companies = conn.execute("SELECT COUNT(*) FROM companies").fetchone()[0]
        n_projects = conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0]

        print("=" * 60)
        print("IMPORT VALIDATION REPORT")
        print(f"Generated: {malaysia_now()}")
        print("=" * 60)
        print(f"Companies in DB:     {n_companies}")
        print(f"  (baris ditambah:   {added}, langkau nama sama: {skipped_dup})")
        if CSV_EXTRA_COMPANIES.exists():
            print(f"  Sumber tambahan:   {CSV_EXTRA_COMPANIES.name}")
        else:
            print(f"  [AMARAN] Tiada {CSV_EXTRA_COMPANIES.name}")
        print(f"Projects imported:   {n_projects} (expected {EXPECTED_PROJECTS})")

        ok = True
        if n_projects != EXPECTED_PROJECTS:
            print("FAIL: Project count mismatch")
            ok = False
        if company_errors:
            print("Company notes:", company_errors)
        if project_errors:
            print("Project errors:", project_errors)
            ok = False

        dup_names = conn.execute(
            "SELECT name, COUNT(*) c FROM companies GROUP BY name HAVING c > 1"
        ).fetchall()
        if dup_names:
            print("FAIL: Duplicate company names:", dup_names)
            ok = False

        if ok:
            print("STATUS: ALL CHECKS PASSED")
        else:
            print("STATUS: CHECKS FAILED — review before event")
            sys.exit(1)

        print(f"Database: {DB_PATH}")
        print("Nombor undian: tiada had kuota (001, 002, ... seterusnya)")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
