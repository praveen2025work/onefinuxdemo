#!/usr/bin/env bash
set -euo pipefail
export DISPLAY=:1
CDP_PORT=9567
USER_DIR=/tmp/ofx-helix-walk-chrome
RAW=/tmp/helix-narrated-raw.mp4
OUT=${1:-/tmp/helix-walkthrough.mp4}
BASE=http://127.0.0.1:7091

REPO="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$REPO/scripts/helix-narration-tts.py"
python3 - <<'PY'
import json, subprocess, pathlib
p=pathlib.Path('/tmp/ofx-voice/beats.json')
beats=json.loads(p.read_text())
for b in beats:
    b['duration']=float(subprocess.check_output(
        ['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0', b['file']], text=True).strip())
p.write_text(json.dumps(beats, indent=2))
print('beats', {b['id']: round(b['duration'],2) for b in beats})
PY

rm -f /tmp/ofx-tour-ready /tmp/ofx-rec-go "$RAW" /tmp/ofx-voice/timeline.json
rm -rf "$USER_DIR"
mkdir -p "$USER_DIR"

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

curl -s -XPOST 'http://127.0.0.1:7081/sim/scenarios/cancel' >/dev/null || true

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
curl -sf "http://127.0.0.1:${CDP_PORT}/json/version" >/dev/null

cp -f "$REPO/scripts/helix-narrated-walkthrough.mjs" /tmp/ofx-pup/helix-narrated-walkthrough.mjs
cd /tmp/ofx-pup
OFX_BASE="$BASE" OFX_CDP="http://127.0.0.1:${CDP_PORT}" node helix-narrated-walkthrough.mjs >/tmp/ofx-helix-tour.log 2>&1 &
TOUR_PID=$!

for i in $(seq 1 50); do
  if [[ -f /tmp/ofx-tour-ready ]]; then echo "tour ready"; break; fi
  if ! kill -0 "$TOUR_PID" 2>/dev/null; then cat /tmp/ofx-helix-tour.log; exit 1; fi
  sleep 0.3
done
[[ -f /tmp/ofx-tour-ready ]]

ffmpeg -y -loglevel error \
  -f x11grab -video_size 1920x1200 -framerate 15 -draw_mouse 1 -i :1.0 \
  -an -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p \
  "$RAW" >/tmp/ofx-helix-ffmpeg.log 2>&1 &
FFMPEG_PID=$!
sleep 0.5
touch /tmp/ofx-rec-go

set +e
wait "$TOUR_PID"
TOUR_EC=$?
set -e
echo "tour exit $TOUR_EC"
sleep 1.0
kill "$FFMPEG_PID" 2>/dev/null || true
wait "$FFMPEG_PID" 2>/dev/null || true

python3 - <<'PY'
import json, subprocess, pathlib
tl = json.loads(pathlib.Path('/tmp/ofx-voice/timeline.json').read_text())
beats = {b['id']: b for b in json.loads(pathlib.Path('/tmp/ofx-voice/beats.json').read_text())}
raw = '/tmp/helix-narrated-raw.mp4'
vid_dur = float(subprocess.check_output(
    ['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0', raw], text=True).strip())
print('video', round(vid_dur,2), 'timeline', tl)

inputs = ['-i', raw]
filters = []
labels = []
idx = 1
for ev in tl['beats']:
    if ev['id'] == 'end':
        continue
    b = beats[ev['id']]
    delay = max(0, int(ev['at'] * 1000))
    inputs += ['-i', b['file']]
    filters.append(f'[{idx}]adelay={delay}|{delay},volume=1.25[a{idx}]')
    labels.append(f'[a{idx}]')
    idx += 1
n = len(labels)
# Stereo AAC 48 kHz: mono AAC is silent in Safari / some GitHub and in-app players.
fc = ';'.join(filters) + (
    f";{''.join(labels)}amix=inputs={n}:dropout_transition=0:normalize=0,"
    'aresample=48000,aformat=channel_layouts=stereo,apad[a]'
)
cmd = ['ffmpeg','-y','-loglevel','error', *inputs,
       '-filter_complex', fc,
       '-map','0:v','-map','[a]',
       '-vf','scale=1600:-2,fps=15',
       '-c:v','libx264','-preset','slow','-crf','24','-pix_fmt','yuv420p',
       '-c:a','aac','-profile:a','aac_low','-b:a','192k','-ac','2','-ar','48000',
       '-shortest','-brand','mp42','-movflags','+faststart',
       '/tmp/helix-walkthrough.mp4']
print('mux', ' '.join(cmd[:8]), '...')
subprocess.check_call(cmd)
print('muxed')
PY

ls -lh /tmp/helix-walkthrough.mp4 "$RAW"
ffprobe -v error -show_entries format=duration -of default=nw=1 /tmp/helix-walkthrough.mp4
tail -n 30 /tmp/ofx-helix-tour.log
exit "$TOUR_EC"
