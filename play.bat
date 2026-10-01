@echo off
setlocal
cd /d "%~dp0"
title Dragon Tactics

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js is required. Please install from https://nodejs.org/
  pause
  exit /b 1
)

echo.
echo   [Dragon Tactics] starting...
echo.

REM Start server in a separate window so this one can launch the browser.
start "Dragon Tactics Server" /min cmd /c "node server.js"

REM Give server a moment to bind the port.
timeout /t 1 /nobreak >nul

REM Try Chrome/Edge with maximized window; fall back to default browser.
set "URL=http://localhost:8000/"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME_X86=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

if exist "%CHROME%" (
  start "" "%CHROME%" --start-maximized --new-window "%URL%"
) else if exist "%CHROME_X86%" (
  start "" "%CHROME_X86%" --start-maximized --new-window "%URL%"
) else if exist "%EDGE%" (
  start "" "%EDGE%" --start-maximized --new-window "%URL%"
) else (
  start "" "%URL%"
)

echo   Browser launched. Close the server window to stop.
echo.
timeout /t 2 /nobreak >nul
endlocal
