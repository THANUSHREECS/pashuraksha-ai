@echo off
cd /d "%~dp0"
echo Starting PashuRaksha AI Backend...
start "PashuRaksha AI Backend" cmd /k "call ""%~dp0start_backend.bat"""
timeout /t 2 /nobreak >nul

echo Starting PashuRaksha AI Frontend...
start "PashuRaksha AI Frontend" cmd /k "call ""%~dp0start_frontend.bat"""
timeout /t 2 /nobreak >nul

echo Opening Browser...
start http://localhost:3000
