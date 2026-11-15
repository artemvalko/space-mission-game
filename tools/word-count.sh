#!/usr/bin/env bash
# Count visible words per screen (tools/word-count.html) in headless Chrome.
# Usage: tools/word-count.sh [before.json]  → prints the table; with a JSON file of earlier
# counts it prints before → after with the % change.
set -u
cd "$(dirname "$0")/.."
PORT=8796
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1
out=$("$CHROME" --headless=new --disable-gpu --virtual-time-budget=400000 --dump-dom "http://localhost:$PORT/tools/word-count.html" 2>/dev/null)
json=$(printf '%s' "$out" | grep -o 'WORDS {[^}]*}' | sed 's/^WORDS //')
[ -z "$json" ] && { echo "No result"; printf '%s' "$out" | grep -A20 'ERRORS'; exit 1; }
printf '%s' "$out" | grep -q '<title>WORDS PASS' || { echo "Console errors:"; printf '%s' "$out" | sed -n '/ERRORS:/,/<\/pre>/p'; }
python3 - "$json" "${1:-}" <<'PY'
import json, sys
now = json.loads(sys.argv[1])
before = json.load(open(sys.argv[2])) if sys.argv[2] else None
print(f"{'screen':<13}{'before':>8}{'after':>8}{'change':>9}" if before else f"{'screen':<13}{'words':>8}")
for k, v in now.items():
    if before:
        b = before.get(k)
        print(f"{k:<13}{b:>8}{v:>8}{(v - b) / b * 100:>8.0f}%")
    else:
        print(f"{k:<13}{v:>8}")
if not before:
    print(json.dumps(now))
PY
