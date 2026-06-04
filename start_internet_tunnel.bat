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

echo Salin URL https://....trycloudflare.com + /daftar /admin /display

echo Tekan Ctrl+C untuk hentikan.

echo.

cloudflared tunnel --url http://127.0.0.1:%UNDI_PORT%

