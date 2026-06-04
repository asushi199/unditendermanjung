"""Tambah syarikat dari contsrchrslt.csv tanpa padam pendaftaran sedia ada."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "scripts"))

from config import CSV_EXTRA_COMPANIES, DB_PATH  # noqa: E402
from database import get_connection, init_db  # noqa: E402
from import_data import merge_companies_from_csv  # noqa: E402


def main():
    if not CSV_EXTRA_COMPANIES.exists():
        print(f"ERROR: Missing {CSV_EXTRA_COMPANIES}")
        sys.exit(1)
    init_db()
    conn = get_connection()
    try:
        before = conn.execute("SELECT COUNT(*) FROM companies").fetchone()[0]
        added, skipped, errors = merge_companies_from_csv(conn, CSV_EXTRA_COMPANIES, "extra")
        conn.commit()
        after = conn.execute("SELECT COUNT(*) FROM companies").fetchone()[0]
        print(f"Sebelum: {before} syarikat")
        print(f"Selepas: {after} syarikat")
        print(f"Ditambah: {added}, langkau (nama sama): {skipped}")
        if errors:
            print("Ralat:", errors)
    finally:
        conn.close()
    print(f"Database: {DB_PATH}")


if __name__ == "__main__":
    main()
