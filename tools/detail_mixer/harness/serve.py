#!/usr/bin/env python3
"""Serves the mixer's folder at http://127.0.0.1:8765/, with one slow address.

  python3 harness/serve.py            (stop it with Ctrl+C)

/wait?ms=N answers, empty, only after N milliseconds. Two uses:

1. Screenshots that wait for the sprites. Headless Chrome screenshots a page
   once it has loaded and its --virtual-time-budget has run out, but that
   clock is virtual: it races ahead of work done off the main thread, such as
   decoding the sprites, so a page can be captured before the engine is
   ready. A page that holds <img src="/wait?ms=4000" alt="" hidden> keeps its
   own load open for four real seconds, long enough. harness/shot.sh starts
   this server by itself; the test pages assemble.py writes, and smoke.html,
   hold that image.

2. Timing on the real clock. On the virtual clock performance.now() stands
   still while a script runs. A page that holds its load open the same way
   can time its drawing meanwhile and write the figures into itself, to be
   read with --dump-dom (no --virtual-time-budget):

     google-chrome --headless=new --no-sandbox --disable-gpu --dump-dom \\
       'http://127.0.0.1:8765/harness/your_timing_page.html'

   Timings from headless Chrome without a GPU are rough and slow; for figures
   to keep, time in a real Chrome (docs/element_detail_brief.md says how).
"""

import functools
import http.server
import pathlib
import time
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)

        if url.path == '/wait':
            wait = urllib.parse.parse_qs(url.query).get('ms', ['4000'])[0]
            time.sleep(min(float(wait), 60000) / 1000)
            self.send_response(204)
            self.end_headers()
            return

        super().do_GET()

    def log_message(self, *args):
        pass


http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(Handler, directory=str(ROOT))).serve_forever()
