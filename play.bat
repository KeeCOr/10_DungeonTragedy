@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js is required. Please install from https://nodejs.org/
  pause
  exit /b 1
)

echo Starting Dragon Tactics...
start "" "http://localhost:8000/"
node server.js

endlocal
