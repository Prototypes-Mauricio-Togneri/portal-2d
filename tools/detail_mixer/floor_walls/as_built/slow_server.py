import http.server, sys, time, functools
class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/slow'):
            time.sleep(12)
            self.send_response(204); self.end_headers(); return
        super().do_GET()
    def log_message(self, *args): pass
http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(Handler, directory=sys.argv[1])).serve_forever()
