@echo off

chcp 65001 >nul

cd /d "%~dp0"

title UndiTender Server (Quick)



if exist server_port.txt (

    set /p UNDI_PORT=<server_port.txt

) else (

    for /f "delims=" %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\find_free_port.ps1"') do set UNDI_PORT=%%P

)



echo Quick start - port %UNDI_PORT%

cd backend

python -m uvicorn main:app --host 0.0.0.0 --port %UNDI_PORT%

pause

