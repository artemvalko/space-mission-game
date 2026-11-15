#!/usr/bin/env bash
# Regenerate docs/MISSION_DEPENDENCY_MATRIX.md from js/data/missionDependencies.js without Node:
# runs tools/matrix-doc.mjs in headless Chrome (with Node installed: `node tools/matrix-doc.mjs` does the same).
set -u
cd "$(dirname "$0")/.."
PORT=8795
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1
for attempt in 1 2 3 4 5; do
  out=$("$CHROME" --headless=new --disable-gpu --virtual-time-budget=20000 --dump-dom "http://localhost:$PORT/tools/matrix-doc.html" 2>/dev/null)
  if printf '%s' "$out" | grep -q 'MATRIX-END'; then
    printf '%s' "$out" | python3 -c '
import html, re, sys
t = sys.stdin.read()
m = re.search(r"MATRIX-BEGIN\n(.*)\nMATRIX-END", t, re.S)
open("docs/MISSION_DEPENDENCY_MATRIX.md", "w").write(html.unescape(m.group(1)) + "\n")
'
    echo "wrote docs/MISSION_DEPENDENCY_MATRIX.md"; exit 0
  fi
done
echo "matrix-doc: no result"; printf '%s' "$out" | grep -o 'ERROR[^<]*'; exit 1
