#!/bin/sh
# Screenshots a page of this folder with headless Chrome, one canvas pixel per
# screen pixel, once it has loaded and its timers have run.
#
#   harness/shot.sh <page> <out.png> [width] [height]
#
# <page> is a path inside tools/detail_mixer/, with a query if you like
# ("harness/smoke.html?c=1&t=40", "build/floor_walls_test_light.html"), and
# <out.png> is taken from tools/detail_mixer/ too, wherever you call this
# from ("build/smoke.png"). The page is opened through harness/serve.py,
# started here when nothing listens on port 8765, so a page that holds
# <img src="/wait?ms=4000" alt="" hidden> is captured only after the sprites
# are decoded (serve.py says why). If the picture shows an error page, or a
# page that isn't yours, something else holds that port, or the server,
# which stops itself after ten minutes, went away mid-shot: run it again.
#
# Headless Chrome captures only its window: ask for one tall enough for the
# whole page. Its window is never narrower than about 500 px, so for a
# phone-width check put the page in a 400 px wide <iframe> of a wider page.
set -e
cd "$(dirname "$0")/.."
page="$1"
out="$2"
width="${3:-1600}"
height="${4:-1200}"

if ! (ss -ltn 2>/dev/null | grep -q ':8765 '); then
  (timeout 600 python3 harness/serve.py >/dev/null 2>&1 &)
  sleep 1
fi

google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size="$width,$height" --virtual-time-budget=15000 --screenshot="$out" "http://127.0.0.1:8765/$page" >/dev/null 2>&1
ls -l "$out"
