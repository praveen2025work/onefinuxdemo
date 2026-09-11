#!/usr/bin/env bash
# Build and start the One Finance UX hub (8080) and the source simulator (8081).
# Usage: ./scripts/run.sh            build + start both
#        ./scripts/run.sh --no-build start using existing jars
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
HUB_PORT="${HUB_PORT:-8080}"
SIM_PORT="${SIM_PORT:-8081}"

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
    echo; echo "Hub:       http://localhost:$HUB_PORT  (open this in a browser)"
    echo "Simulator: http://localhost:$SIM_PORT/sim/scenarios"
    echo "Demo:      ./scripts/demo.sh    Stop: ./scripts/stop.sh"
    exit 0
  fi
  printf "."; sleep 1
done
echo; echo "Hub did not start in 60s; see logs/hub.log"; exit 1
