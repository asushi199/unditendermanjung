@echo off

chcp 65001 >nul

cd /d "%~dp0"



if exist server_port.txt (

    set /p UNDI_PORT=<server_port.txt

) else (

    set UNDI_PORT=8088

)



echo ============================================

echo  Undi Tender - Akses Internet (Cloudflare)

echo ============================================

echo.

echo Pastikan start_server.bat sudah berjalan.

echo Port pelayan: %UNDI_PORT%

echo.



where cloudflared >nul 2>&1

if errorlevel 1 (

    echo cloudflared TIDAK dijumpai.

    echo   winget install --id Cloudflare.cloudflared

    echo   atau: ngrok http %UNDI_PORT%

    pause

    exit /b 1

)



echo Membuka terowong ke http://127.0.0.1:%UNDI_PORT% ...
echo.
echo [WiFi dewan tidak stabil - mod Cloudflare]
echo  1. Komputer INI mesti ada internet keluar stabil:
echo     guna hotspot 4G/5G telefon, JANGAN bergantung WiFi dewan untuk terowong.
echo  2. Tetapkan DNS Windows: 1.1.1.1 atau 8.8.8.8 (kurang ralat i/o timeout).
echo  3. Salin SATU URL https://....trycloudflare.com untuk SEMUA peranti:
echo     /display (projektor), /admin, /register/1 ... /register/4
echo  4. Paparan kemas kini ~0.4 saat melalui terowong (tanpa SSE).
echo  5. Jangan tutup tetingkap ini semasa acara. Tutup = URL mati.
echo  6. Ralat DNS masih boleh muncul; jika URL tidak keluar, restart script ini.
echo.
echo Tekan Ctrl+C untuk hentikan terowong.

echo.

cloudflared tunnel --url http://127.0.0.1:%UNDI_PORT%

