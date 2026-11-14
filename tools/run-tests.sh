#!/usr/bin/env bash
# Run the engine self-test (js/engine/resources.test.html) in headless Chrome.
# Usage: tools/run-tests.sh        → exit 0 on PASS, 1 on FAIL / no result.
# Starts a temporary local server on port 8799 and stops it afterwards.
set -u
cd "$(dirname "$0")/.."
PORT=8799
CHROME="${CHROME:-}"
if [ -z "$CHROME" ]; then
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "$(command -v google-chrome || true)" "$(command -v chromium || true)" "$(command -v chromium-browser || true)"; do
    [ -n "$c" ] && [ -x "$c" ] && CHROME="$c" && break
  done
fi
[ -z "$CHROME" ] && { echo "Chrome/Chromium not found (set CHROME=/path/to/chrome)"; exit 1; }

python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1

# Headless dumps sometimes race the page; retry until the page reports PASS/FAIL.
for attempt in 1 2 3 4 5 6 7 8; do
  out=$("$CHROME" --headless=new --disable-gpu --virtual-time-budget=200000 --dump-dom "http://localhost:$PORT/js/engine/resources.test.html" 2>/dev/null)
  title=$(printf '%s' "$out" | grep -o '<title>[^<]*' | sed 's/<title>//')
  case "$title" in
    PASS*|FAIL*)
      printf '%s\n' "$out" | grep -o '[0-9]* passed, [0-9]* failed'
      printf '%s\n' "$out" | grep -o '<span class="fail">FAIL</span> — [^<]*' | sed 's/<[^>]*>//g'
      case "$title" in PASS*) echo "✅ $title"; exit 0;; *) echo "❌ $title"; exit 1;; esac
      ;;
  esac
done
echo "❌ No test result captured"; exit 1
