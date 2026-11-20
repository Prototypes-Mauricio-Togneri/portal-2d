#!/usr/bin/env python3
"""Serves the mixer's folder over http, with one deliberately slow address.

Headless Chrome dumps or screenshots a page as soon as it has loaded, and its
--virtual-time-budget makes timers run on a virtual clock, on which
performance.now() stands still while a script runs. To time drawing on the
real clock, a page holds its own load open with <img src="/slow">, which this
server answers only after 12 seconds, runs its timings meanwhile, and writes
them into the page:

  (timeout 40 python3 harness/slow_server.py &) ; sleep 1
  google-chrome --headless=new --no-sandbox --disable-gpu --dump-dom \\
    'http://127.0.0.1:8765/harness/timing.html' | sed -n '/<pre/,/<\\/pre>/p'

Timings from headless Chrome without a GPU are rough and slow; for figures to
keep, time in a real Chrome (see docs/element_detail_brief.md).
"""

import functools
import http.server
import pathlib
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/slow'):
            time.sleep(12)
            self.send_response(204)
            self.end_headers()
            return

        super().do_GET()

    def log_message(self, *args):
        pass


http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(Handler, directory=str(ROOT))).serve_forever()
