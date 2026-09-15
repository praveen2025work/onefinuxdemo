#!/usr/bin/env bash
set -euo pipefail
export DISPLAY=:1
CDP_PORT=9567
USER_DIR=/tmp/ofx-helix-walk-chrome
RAW=/tmp/helix-silent-raw.mp4
OUT=${1:-/tmp/helix-silent-walkthrough.mp4}
BASE=http://127.0.0.1:5173

rm -f /tmp/ofx-tour-ready /tmp/ofx-rec-go "$RAW"
rm -rf "$USER_DIR"
mkdir -p "$USER_DIR"

# Minimize other visible chrome windows so the grab is this tour only.
if command -v xdotool >/dev/null; then
  for id in $(xdotool search --onlyvisible --class google-chrome 2>/dev/null || true); do
    xdotool windowminimize "$id" || true
  done
fi

if [[ -f /tmp/ofx-helix-chrome.pid ]]; then
  old=$(cat /tmp/ofx-helix-chrome.pid)
  kill "$old" 2>/dev/null || true
  sleep 0.4
fi

google-chrome-stable \
  --no-sandbox --test-type --disable-gpu --disable-dev-shm-usage \
  --use-gl=angle --use-angle=swiftshader-webgl \
  --password-store=basic --no-first-run --no-default-browser-check \
  --disable-session-crashed-bubble --disable-infobars --disable-translate \
  --disable-component-update --disable-background-networking --noerrdialogs \
  --disable-features=Translate,TranslateUI,ChromeWhatsNewUI \
  --check-for-update-interval=31536000 \
  --user-data-dir="$USER_DIR" \
  --window-size=1920,1200 --window-position=0,0 \
  --remote-debugging-port="$CDP_PORT" \
  --class=ofx-helix-walk \
  --app="${BASE}/?theme=dark" >/tmp/ofx-helix-chrome.log 2>&1 &
CHROME_PID=$!
echo "$CHROME_PID" > /tmp/ofx-helix-chrome.pid
echo "chrome pid $CHROME_PID"

for i in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null; then
    echo "CDP up"
    break
  fi
  sleep 0.4
done
curl -sf "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null || { echo "CDP failed"; cat /tmp/ofx-helix-chrome.log; exit 1; }

cd /tmp/ofx-pup
OFX_BASE="$BASE" OFX_CDP="http://127.0.0.1:${CDP_PORT}" node helix-silent-walkthrough.mjs >/tmp/ofx-helix-tour.log 2>&1 &
TOUR_PID=$!
echo "tour pid $TOUR_PID"

for i in $(seq 1 50); do
  if [[ -f /tmp/ofx-tour-ready ]]; then
    echo "tour ready"
    break
  fi
  if ! kill -0 "$TOUR_PID" 2>/dev/null; then
    echo "tour died before ready"
    cat /tmp/ofx-helix-tour.log
    exit 1
  fi
  sleep 0.3
done
[[ -f /tmp/ofx-tour-ready ]] || { echo "tour never ready"; cat /tmp/ofx-helix-tour.log; exit 1; }

ffmpeg -y -loglevel error \
  -f x11grab -video_size 1920x1200 -framerate 12 -draw_mouse 1 -i :1.0 \
  -an -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p \
  "$RAW" >/tmp/ofx-helix-ffmpeg.log 2>&1 &
FFMPEG_PID=$!
echo "ffmpeg pid $FFMPEG_PID"
sleep 0.6
touch /tmp/ofx-rec-go

set +e
wait "$TOUR_PID"
TOUR_EC=$?
set -e
echo "tour exit $TOUR_EC"
sleep 1.2
kill "$FFMPEG_PID" 2>/dev/null || true
wait "$FFMPEG_PID" 2>/dev/null || true

if [[ ! -s "$RAW" ]]; then
  echo "raw video missing"
  cat /tmp/ofx-helix-ffmpeg.log /tmp/ofx-helix-tour.log
  exit 1
fi

ffmpeg -y -loglevel error -i "$RAW" -an \
  -vf "scale=1600:-2,fps=12" \
  -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart \
  "$OUT"

ls -lh "$RAW" "$OUT"
tail -n 40 /tmp/ofx-helix-tour.log
exit "$TOUR_EC"
