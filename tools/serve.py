"""Servidor local de desenvolvimento sem cache: python tools/serve.py [porta]"""
import sys, http.server, functools, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5188
http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(NoCache, directory=ROOT)).serve_forever()
