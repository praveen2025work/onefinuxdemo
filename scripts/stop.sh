#!/usr/bin/env bash
# Stops both apps and waits for them to exit, so the H2 file lock is released before a restart.
cd "$(dirname "$0")/.."
for f in logs/hub.pid logs/sim.pid; do
  [[ -f $f ]] || continue
  pid=$(cat "$f"); kill "$pid" 2>/dev/null
  for _ in $(seq 1 30); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
  rm -f "$f"
done
echo "Stopped."
