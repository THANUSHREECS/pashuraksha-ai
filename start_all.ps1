# PashuRaksha AI Launcher for PowerShell
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Launching PashuRaksha AI Full-Stack Platform   " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan

$root = $PSScriptRoot
if (Test-Path "$root\pashuraksha-ai\backend") {
    $backendDir = "$root\pashuraksha-ai\backend"
    $frontendDir = "$root\pashuraksha-ai\frontend"
} else {
    $backendDir = "$root\backend"
    $frontendDir = "$root\frontend"
}

if (Test-Path "$root\.venv\Scripts\python.exe") {
    $pythonExe = "$root\.venv\Scripts\python.exe"
} else {
    $pythonExe = "$root\..\.venv\Scripts\python.exe"
}

# 1. Start Backend in a dedicated window
Write-Host "Starting Backend API on http://127.0.0.1:8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$backendDir'; & '$pythonExe' -m uvicorn app.main:app --reload --port 8000"

Start-Sleep -Seconds 2

# 2. Start Frontend Vite Server in a dedicated window
Write-Host "Starting Frontend on http://127.0.0.1:3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "Set-Location '$frontendDir'; npm run dev -- --port 3000 --host 127.0.0.1"

Start-Sleep -Seconds 2

# 3. Open Web Browser
Write-Host "Opening application in browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host "PashuRaksha AI is up and running!" -ForegroundColor Cyan
