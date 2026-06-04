# Undi Tender Manjung

Sistem web **PPD Manjung** untuk pendaftaran syarikat (4 kaunter) dan undian projek penyelenggaraan sekolah dengan paparan awam dua fasa (projek → nombor pemenang).

Repositori: [github.com/asushi199/unditendermanjung](https://github.com/asushi199/unditendermanjung)

## Stack

| Lapisan | Teknologi |
|--------|-----------|
| Backend | Python 3.10+, FastAPI, SQLite (`undi.db`) |
| Frontend | React 18, Vite, TypeScript |
| Siaran langsung | SSE (`/api/events/stream`) — skrin paparan & admin segerak |

## Keperluan

- Python 3.10+
- Node.js 18+
- Windows (skrip `.bat` untuk hari acara)

## Persediaan (sebelum hari acara)

```powershell
cd backend
pip install -r requirements.txt
cd ..\frontend
npm install
cd ..
python scripts\import_data.py
```

- Letak logo: `Logo/logo ppd.png` (sync automatik melalui `start_server.bat`)
- **Wajib:** tukar `ADMIN_PIN` dalam `backend/config.py` sebelum hari acara
- Data syarikat: `Data/senarai kontraktor G 1 (B24).csv` + `Data/contsrchrslt.csv` (digabung, nama unik)
- Data projek: `Data/PERUNTUKAN PENYELENGGARAAN SEKOLAH ATAS 50 TAHUN.xlsx`

Tambah syarikat tanpa reset pendaftaran:

```powershell
python scripts\merge_extra_companies.py
```

## Jalankan pelayan

```powershell
.\start_server.bat
```

Skrip akan: sync logo → build frontend → **cari port kosong** (8088, 8090, …) → mula uvicorn.

- Pantau tetingkap: **PORT DIPILIH** dan fail `ALAMAT_ACARA.txt` (dijana pada folder projek)
- Pantas tanpa build: `start_server_quick.bat`
- Internet (opsyenal): `start_internet_tunnel.bat` (Cloudflare) — selepas `start_server.bat`
- **WiFi dewan tidak stabil:** jangan harap `http://IP:PORT` antara peranti. Guna **satu** URL `https://….trycloudflare.com` untuk semua; komputer pelayan sambung internet melalui **hotspot 4G/5G** (bukan WiFi dewan) supaya `cloudflared` stabil. `/display` dan `/admin` melalui terowong: poll ~0.4s, tanpa SSE.

**Nota port:** Laptop Acer sering guna **8080** (`AcerLightingService`). Sistem elak 8080 secara automatik.

## URL (ganti `IP` dan `PORT` dari tetingkap server)

| Peranan | URL |
|--------|-----|
| Utama | `http://IP:PORT/` |
| Pilih kaunter | `http://IP:PORT/daftar` |
| **Kaunter 1–4** | `http://IP:PORT/register/1` … `/register/4` |
| Urusetia undian | `http://IP:PORT/admin` |
| Skrin projektor / OBS | `http://IP:PORT/display` |
| Semak data | `http://IP:PORT/semak` |
| Panduan | `http://IP:PORT/panduan` |
| Cetak pendaftaran | `http://IP:PORT/cetak/pendaftaran` |
| Cetak keputusan | `http://IP:PORT/cetak/keputusan` |

## Ciri utama

- **4 kaunter** — URL berasingan, rekod `counter_id` dalam CSV
- **Nombor undian** — 001, 002, … tanpa had kuota; setiap syarikat satu nombor sahaja
- **Syarikat tambahan** — import CSV + tambah manual (PIN) pada halaman kaunter
- **Undian 2 fasa** — paparan projek → masukkan nombor → paparan pemenang; **Kemaskini** sebelum «Projek Seterusnya»
- **Eksport & cetak** — CSV + halaman cetak/PDF dari panel Utiliti admin
- **Masa** — disimpan & dieksport dalam **Waktu Malaysia (MYT)**

## Aliran hari acara

### Kaunter (1–4)

1. Buka `/register/N` untuk kaunter anda
2. Cari syarikat (min. 2 huruf) → sahkan → dapat nombor undian
3. Syarikat yang telah daftar tidak boleh daftar semula

### Urusetia (`/admin`)

1. Pilih projek → tayar ke skrin (fasa projek)
2. Masukkan nombor undian → paparan pemenang
3. Salah? **Kemaskini** (sebelum «Projek Seterusnya»)
4. **Projek Seterusnya** — simpan keputusan, projek seterusnya

### Latihan

**Reset Latihan** dalam Utiliti admin — padam pendaftaran & keputusan. Jangan guna selepas hari rasmi bermula.

## Struktur projek

```
UndiTender/
├── backend/          # FastAPI, services, SQLite
├── frontend/         # React SPA
├── Data/             # CSV/Excel sumber
├── scripts/          # import, ujian, port
├── start_server.bat
└── start_internet_tunnel.bat
```

## Ujian

```powershell
python scripts\test_concurrent_register.py 100
python scripts\test_draw_flow.py
```

## Keselamatan

- Jangan commit `undi.db`, `.env`, atau PIN sebenar
- URL terowong Cloudflare adalah awam — tutup selepas acara
- Kongsi `/admin` hanya kepada urusetia

## 中文简要

- 活动电脑装 Python + Node，运行 `start_server.bat`
- 四个柜台：`/register/1`～`/register/4`；主持 `/admin`；投影 `/display`
- 公司名单合并两个 CSV；号码 sequential，不限 384
- 活动前改 `ADMIN_PIN`；勿提交数据库到 Git
- 打印：`/cetak/pendaftaran`、`/cetak/keputusan`

## Lesen

Projek dalaman PPD — gunakan mengikut polisi pejabat.
