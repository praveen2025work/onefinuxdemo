#!/usr/bin/env bash
# Render every Mermaid source in this folder to SVG (scalable) and PNG (2x).
# Uses the system Chrome so no Chromium download is needed.
#
#   ./render.sh
#
# Requires: node/npx (mermaid-cli is fetched on demand) and google-chrome-stable.
set -euo pipefail
cd "$(dirname "$0")"

CHROME="${CHROME:-/usr/bin/google-chrome-stable}"
PUP="$(mktemp)"
cat > "$PUP" <<JSON
{ "executablePath": "${CHROME}", "args": ["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"] }
JSON

export PUPPETEER_SKIP_DOWNLOAD=1 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

for mmd in *.mmd; do
  base="${mmd%.mmd}"
  echo "rendering ${base} ..."
  npx -y @mermaid-js/mermaid-cli@11 -p "$PUP" -c mermaid-config.json -i "$mmd" -o "${base}.svg" -b white
  npx -y @mermaid-js/mermaid-cli@11 -p "$PUP" -c mermaid-config.json -i "$mmd" -o "${base}.png" -b white -s 2
done

rm -f "$PUP"
echo "done."
