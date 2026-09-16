@echo off
REM Build and start the One Finance hub, simulator, and React console on Windows.
REM Usage: scripts\run.cmd [--no-build]
REM        set HUB_PORT=7090 & set SIM_PORT=7092 & scripts\run.cmd   (if 7070/7081 are taken)
REM Safe to run from the repo root or from the scripts folder.
setlocal
cd /d "%~dp0.."
if not exist logs mkdir logs
if "%HUB_PORT%"=="" set HUB_PORT=7070
if "%SIM_PORT%"=="" set SIM_PORT=7081

if /i not "%~1"=="--no-build" (
  echo Building Java ^(Java 21 + Maven 3.9 required^)...
  REM Skip unit tests on the demo start path so a leftover WARN does not look like a failed boot. CI runs mvn verify.
  call mvn -q -DskipTests package || exit /b 1
)

start "onefinux-hub" /min cmd /c "java -Dserver.port=%HUB_PORT% -Donefinux.public-url=http://localhost:%HUB_PORT% -Donefinux.simulator-url=http://localhost:%SIM_PORT% -jar onefinux-hub\target\onefinux-hub-0.1.0-SNAPSHOT.jar > logs\hub.log 2>&1"
start "source-simulator" /min cmd /c "java -Dserver.port=%SIM_PORT% -Dsim.hub-url=http://localhost:%HUB_PORT% -jar source-simulator\target\source-simulator-0.1.0-SNAPSHOT.jar > logs\sim.log 2>&1"

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
echo Hub is up. This prompt coming back is success.
echo Java is running in two minimised windows: onefinux-hub and source-simulator.
echo   API         http://localhost:%HUB_PORT%   REST + SSE, not the product UI
echo   Simulator   http://localhost:%SIM_PORT%/sim/scenarios
echo.
echo Starting the product UI in a window titled onefinux-console...
start "onefinux-console" cmd /k call "%~dp0console.cmd"
echo When that window prints Local, open http://127.0.0.1:7091
echo Drive: http://127.0.0.1:7091/drive
echo WiFi/Ethernet: use this PC's IPv4 on port 7091 (printed in the console window).
echo Stop:  close onefinux-hub, source-simulator, and onefinux-console.
endlocal
cd /d "%~dp0.."
