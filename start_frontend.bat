@echo off
cd /d "%~dp0"
if exist "pashuraksha-ai\frontend" (
    cd /d "%~dp0pashuraksha-ai\frontend"
) else (
    cd /d "%~dp0frontend"
)
echo =========================================================
echo Starting PashuRaksha AI Frontend on http://127.0.0.1:3000
echo =========================================================
call npm run dev -- --port 3000 --host 127.0.0.1
pause
