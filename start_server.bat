@echo off

chcp 65001 >nul

cd /d "%~dp0"

title UndiTender Server



echo ============================================

echo  Undi Tender - Start Server

echo ============================================

echo.



where python >nul 2>&1

if errorlevel 1 (

    echo [RALAT] Python tidak dijumpai. Pasang Python 3.10+ dan tick "Add to PATH".

    goto :fail

)



where npm >nul 2>&1

if errorlevel 1 (

    echo [RALAT] npm tidak dijumpai. Pasang Node.js 18+.

    goto :fail

)



echo [1/4] Sync logo (opsyenal)...

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\sync_logo.ps1"

if errorlevel 1 echo [AMARAN] Logo tidak disalin.



echo.

echo [2/4] Build frontend...

cd frontend

call npm run build

if errorlevel 1 (

    echo [RALAT] npm run build gagal.

    cd ..

    goto :fail

)

cd ..



echo.

echo [3/4] Cari port kosong (auto)...

for /f "delims=" %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\find_free_port.ps1"') do set UNDI_PORT=%%P

if not defined UNDI_PORT (

    echo [RALAT] Tiada port kosong.

    goto :fail

)



powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\write_event_urls.ps1" -Port %UNDI_PORT%



echo.

echo ============================================

echo  PORT DIPILIH: %UNDI_PORT%

echo  Daftar:  http://127.0.0.1:%UNDI_PORT%/daftar

echo  Urusetia: http://127.0.0.1:%UNDI_PORT%/admin

echo  Senarai URL penuh: ALAMAT_ACARA.txt

echo ============================================

echo  Catat port ini untuk kaunter / projektor!

echo  Tutup tetingkap ini = server berhenti.

echo.



echo [4/4] Start server...

cd backend

python -m uvicorn main:app --host 0.0.0.0 --port %UNDI_PORT%

if errorlevel 1 goto :fail

goto :end



:fail

echo.

echo Server TIDAK berjalan. Baca mesej di atas.

pause

exit /b 1



:end

pause

