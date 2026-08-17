@echo off
cd /d "%~dp0"
setlocal

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm are required to run Ella.
  echo Please install Node.js and reopen this launcher.
  pause
  exit /b 1
)

echo Starting Ella...
start "" http://localhost:4173
call npm run start:ella
if errorlevel 1 (
  echo.
  echo Ella did not start correctly.
  echo Try running: npm install
  echo Then launch this file again.
  pause
)
