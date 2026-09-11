@echo off
REM Build and start the One Finance UX hub (8080) and source simulator (8081) on Windows.
REM Requires Java 21 and Maven 3.9 on PATH. Usage: scripts\run.cmd  [--no-build]
setlocal
cd /d "%~dp0.."
if not exist logs mkdir logs
if /i not "%~1"=="--no-build" (
  echo Building...
  call mvn -q package || exit /b 1
)
start "onefinux-hub" /min cmd /c "java -jar onefinux-hub\target\onefinux-hub-0.1.0-SNAPSHOT.jar > logs\hub.log 2>&1"
start "source-simulator" /min cmd /c "java -jar source-simulator\target\source-simulator-0.1.0-SNAPSHOT.jar > logs\sim.log 2>&1"
echo Starting... give it about 20 seconds, then open http://localhost:8080
echo Stop by closing the two minimised windows titled onefinux-hub and source-simulator.
timeout /t 20 > nul
start "" http://localhost:8080
