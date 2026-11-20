#!/bin/sh
# Screenshots a local page with headless Chrome, at one canvas pixel per
# screen pixel, after its scripts and timers have run.
#
#   harness/shot.sh <page or URL> <out.png> [width] [height]
#
# A path is opened as a file:// page; add a query after it as you would in a
# URL ("harness/smoke.html?c=1"). The window is as tall as you ask: headless
# Chrome captures only the window, so make it tall enough for the whole page.
# Chrome's window is never narrower than about 500 px, so for a phone-width
# check put the page in a 400 px wide <iframe> of a wider page instead.
# Timers run on a virtual clock here, so performance.now() does not advance
# during them: time things with harness/slow_server.py instead.
set -e
page="$1"
out="$2"
width="${3:-1600}"
height="${4:-1200}"
case "$page" in
  http://*|https://*|file://*) url="$page" ;;
  /*) url="file://$page" ;;
  *) url="file://$(pwd)/$page" ;;
esac
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size="$width,$height" --virtual-time-budget=15000 --screenshot="$out" "$url" >/dev/null 2>&1
ls -l "$out"
