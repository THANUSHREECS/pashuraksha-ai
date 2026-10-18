@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=%~dp0..\.venv\Scripts\python.exe"
)
if exist "pashuraksha-ai\backend" (
    cd /d "%~dp0pashuraksha-ai\backend"
) else (
    cd /d "%~dp0backend"
)
echo ========================================================
echo Starting PashuRaksha AI Backend on http://127.0.0.1:8000
echo API Docs: http://127.0.0.1:8000/docs
echo ========================================================
"%PYTHON_EXE%" -m uvicorn app.main:app --reload --port 8000
pause
