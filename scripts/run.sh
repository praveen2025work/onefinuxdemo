#!/usr/bin/env bash
# Build and start the One Finance hub (7070) and the source simulator (7081).
# Does not start the React console — that is a second terminal: cd frontend/web && npm run dev
# Usage: ./scripts/run.sh            build + start both
#        ./scripts/run.sh --no-build start using existing jars
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
HUB_PORT="${HUB_PORT:-7070}"
SIM_PORT="${SIM_PORT:-7081}"

if [[ "${1:-}" != "--no-build" ]]; then
  echo "Building (Java 21 + Maven 3.9 required)..."
  mvn -q -DskipTests=false package
fi

java -Dserver.port="$HUB_PORT" -Donefinux.public-url="http://localhost:$HUB_PORT" -Donefinux.simulator-url="http://localhost:$SIM_PORT" -jar onefinux-hub/target/onefinux-hub-0.1.0-SNAPSHOT.jar > logs/hub.log 2>&1 &
echo $! > logs/hub.pid
java -Dserver.port="$SIM_PORT" -Dsim.hub-url="http://localhost:$HUB_PORT" -Dsim.allowed-origin="http://localhost:$HUB_PORT" -jar source-simulator/target/source-simulator-0.1.0-SNAPSHOT.jar > logs/sim.log 2>&1 &
echo $! > logs/sim.pid

printf "Waiting for the hub"
for _ in $(seq 1 60); do
  if curl -sf http://localhost:$HUB_PORT/api/outcomes > /dev/null; then
    echo; echo "Hub API:   http://localhost:$HUB_PORT  (REST + SSE - not the product UI)"
    echo "Simulator: http://localhost:$SIM_PORT/sim/scenarios"
    echo "Console:   cd frontend/web && npm install && npm run dev"
    echo "           then open http://localhost:7091  Drive: /drive"
    echo "Stop:      ./scripts/stop.sh"
    exit 0
  fi
  printf "."; sleep 1
done
echo; echo "Hub did not start in 60s; see logs/hub.log"; exit 1
