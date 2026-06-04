import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

# 8088: laptop Acer sering sudah guna 8080 (AcerLightingService)
SERVER_PORT = int(os.environ.get("UNDI_PORT", "8088"))
DATA_DIR = ROOT_DIR / "Data"
DB_PATH = ROOT_DIR / "undi.db"
BACKUPS_DIR = ROOT_DIR / "backups"
STATIC_DIR = ROOT_DIR / "frontend" / "dist"

CSV_CONTRACTORS = DATA_DIR / "senarai kontraktor G 1 (B24).csv"
CSV_EXTRA_COMPANIES = DATA_DIR / "contsrchrslt.csv"
XLSX_PROJECTS = DATA_DIR / "PERUNTUKAN PENYELENGGARAAN SEKOLAH ATAS 50 TAHUN.xlsx"

# Bilangan asal dari import CSV; kuota sebenar = bilangan syarikat dalam DB
EXPECTED_REGISTRATIONS = 384
ADMIN_PIN = "1234"  # Change before event day
EVENT_ORG = "Pejabat Pendidikan Daerah"
EVENT_HEADLINE = "KENYATAAN TAWARAN PEROLEHAN KERJA SECARA UNDIAN"
EVENT_SUBHEADLINE = "KERJA UNDI BILANGAN 1 TAHUN 2026"
EVENT_TITLE = "PENYELENGGARAAN SEKOLAH ATAS 50 TAHUN"  # baris tambahan (opsyenal)
