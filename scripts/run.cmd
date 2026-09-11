@echo off
REM Build and start the One Finance UX hub and source simulator on Windows.
REM Requires Java 21 and Maven 3.9 on PATH.
REM Usage: scripts\run.cmd [--no-build]
REM        set HUB_PORT=8090 & set SIM_PORT=8091 & scripts\run.cmd   (if 8080/8081 are taken)
setlocal
cd /d "%~dp0.."
if not exist logs mkdir logs
if "%HUB_PORT%"=="" set HUB_PORT=8080
if "%SIM_PORT%"=="" set SIM_PORT=8081

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
echo Hub:       http://localhost:%HUB_PORT%  ^(opening in your browser^)
echo Simulator: http://localhost:%SIM_PORT%/sim/scenarios
echo Stop:      close the two minimised windows titled onefinux-hub and source-simulator.
start "" http://localhost:%HUB_PORT%
