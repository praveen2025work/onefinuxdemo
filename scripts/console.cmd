@echo off
REM Start the One Finance React console (Vite on 7091).
REM run.cmd opens this window for you. Safe to run on its own from repo root or scripts\.
cd /d "%~dp0..\frontend\web"
if not exist package.json (
  echo frontend\web\package.json not found.
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo Node.js / npm is not on PATH. Install Node.js 18+ and reopen this window.
  exit /b 1
)
echo Starting the product UI on http://localhost:7091
echo When Vite prints Local, open http://localhost:7091
echo Drive: http://localhost:7091/drive
if not exist node_modules (
  echo npm install ^(first run^)...
  call npm install || exit /b 1
)
call npm run dev
