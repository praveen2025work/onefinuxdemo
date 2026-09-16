@echo off
REM Build and start the One Finance hub and source simulator on Windows.
REM Does not start the React console — that is a second terminal: cd frontend\web && npm run dev
REM Usage: scripts\run.cmd [--no-build]
REM        set HUB_PORT=7090 & set SIM_PORT=7091 & scripts\run.cmd   (if 7070/7081 are taken)
setlocal
cd /d "%~dp0.."
if not exist logs mkdir logs
if "%HUB_PORT%"=="" set HUB_PORT=7070
if "%SIM_PORT%"=="" set SIM_PORT=7081

if /i not "%~1"=="--no-build" (
  echo Building ^(Java 21 + Maven 3.9 required^)...
  call mvn -q -DskipTests=false package || exit /b 1
)

start "onefinux-hub" /min cmd /c "java -Dserver.port=%HUB_PORT% -Donefinux.public-url=http://localhost:%HUB_PORT% -Donefinux.simulator-url=http://localhost:%SIM_PORT% -jar onefinux-hub\target\onefinux-hub-0.1.0-SNAPSHOT.jar > logs\hub.log 2>&1"
start "source-simulator" /min cmd /c "java -Dserver.port=%SIM_PORT% -Dsim.hub-url=http://localhost:%HUB_PORT% -Dsim.allowed-origin=http://localhost:%HUB_PORT% -jar source-simulator\target\source-simulator-0.1.0-SNAPSHOT.jar > logs\sim.log 2>&1"

echo|set /p="Waiting for the hub"
for /l %%i in (1,1,60) do (
  curl -s -f -o nul http://localhost:%HUB_PORT%/api/outcomes && goto :ready
  echo|set /p="."
  ping -n 2 127.0.0.1 >nul
)
echo.
echo Hub did not start in 60s; see logs\hub.log
exit /b 1

:ready
echo.
echo Hub API:   http://localhost:%HUB_PORT%  ^(REST + SSE — not the product UI^)
echo Simulator: http://localhost:%SIM_PORT%/sim/scenarios
echo Console:   cd frontend\web ^&^& npm install ^&^& npm run dev
echo            then open http://localhost:5173  Drive: /drive
echo Stop:      close the two minimised windows titled onefinux-hub and source-simulator.
echo Hosted:    scripts\windows\build-demo.cmd  then elevated install-nssm.ps1 and install-iis-site.ps1
