#!/usr/bin/env bash
# Render each mockup screen headlessly. One profile per page so Chrome does not
# block on a shared SingletonLock, with a hard timeout per page.
set -uo pipefail
OUT="${1:-/tmp/shots}"
BASE="${2:-http://127.0.0.1:8771}"
SIZE="${3:-1600,1100}"
mkdir -p "$OUT"

for p in index head user ready blocked rtb config stitch components; do
  prof="$(mktemp -d)"
  timeout 40 google-chrome \
    --headless --disable-gpu --no-sandbox --disable-dev-shm-usage \
    --hide-scrollbars --force-device-scale-factor=1 \
    --user-data-dir="$prof" \
    --window-size="$SIZE" \
    --virtual-time-budget=4000 \
    --screenshot="$OUT/$p.png" "$BASE/$p.html" >/dev/null 2>&1
  if [[ -s "$OUT/$p.png" ]]; then echo "ok   $p"; else echo "FAIL $p"; fi
  rm -rf "$prof"
done
