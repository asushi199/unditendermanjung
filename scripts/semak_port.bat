@echo off

chcp 65001 >nul

cd /d "%~dp0\.."

echo Semak port untuk hari acara (jalankan pada komputer pelayan):

echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0find_free_port.ps1"

if errorlevel 1 (

    echo.

    echo RALAT: Tiada port cadangan kosong.

) else (

    echo.

    echo OK - port di atas boleh digunakan. Jalankan start_server.bat.

    type server_port.txt 2>nul

)

echo.

pause

