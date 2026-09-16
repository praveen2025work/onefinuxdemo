@echo off
REM Build the Windows demo artifacts: Java jars + React static files for IIS.
REM Next (elevated PowerShell): install-nssm.ps1 then install-iis-site.ps1
REM Usage: scripts\windows\build-demo.cmd
setlocal
cd /d "%~dp0..\.."

where java >nul 2>&1 || (
  echo Java 21 is required. Set JAVA_HOME and add %%JAVA_HOME%%\bin to PATH.
  exit /b 1
)
where mvn >nul 2>&1 || (
  echo Maven 3.9+ is required and must be on PATH.
  exit /b 1
)
where node >nul 2>&1 || (
  echo Node.js 18+ is required and must be on PATH.
  exit /b 1
)

echo.
echo === 1/2  Java hub + simulator ^(mvn package^) ===
call mvn -DskipTests=false package
if errorlevel 1 exit /b 1

echo.
echo === 2/2  React console ^(npm ci + npm run build^) ===
cd frontend\web
if exist package-lock.json (
  call npm ci
) else (
  call npm install
)
if errorlevel 1 exit /b 1
call npm run build
if errorlevel 1 exit /b 1

if not exist dist\index.html (
  echo frontend\web\dist\index.html is missing. The Vite build did not finish.
  exit /b 1
)
if not exist dist\web.config (
  echo frontend\web\dist\web.config is missing. public\web.config must copy into dist.
  exit /b 1
)

cd /d "%~dp0..\.."
echo.
echo Build complete. Artifacts:
echo   Hub jar:       onefinux-hub\target\onefinux-hub-0.1.0-SNAPSHOT.jar
echo   Simulator jar: source-simulator\target\source-simulator-0.1.0-SNAPSHOT.jar
echo   IIS site root: frontend\web\dist   ^(No Managed Code; includes web.config^)
echo.
echo Hosted demo next, from an elevated PowerShell:
echo   powershell -ExecutionPolicy Bypass -File scripts\windows\install-nssm.ps1
echo   powershell -ExecutionPolicy Bypass -File scripts\windows\install-iis-site.ps1
echo Then open http://localhost:8080
echo.
echo Local Vite demo instead: scripts\run.cmd   ^(opens Java plus the console on 7091^)
exit /b 0
