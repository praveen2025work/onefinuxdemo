@echo off
REM Start the One Finance React console (Vite on 7091, all IPv4 interfaces).
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
echo Starting the product UI on port 7091 (localhost and this PC's IPv4).
echo This PC:     http://127.0.0.1:7091
echo Drive:       http://127.0.0.1:7091/drive
echo WiFi/Ethernet IPv4:
call "%~dp0windows\show-lan-ui.cmd"
echo If IPv4 does not load, allow TCP 7091 in Windows Firewall (Private).
if not exist node_modules (
  echo npm install ^(first run^)...
  call npm install || exit /b 1
)
call npm run dev
