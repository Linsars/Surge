import base64, json, os, tempfile, subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler

class H(BaseHTTPRequestHandler):
    def do_POST(s):
        n = int(s.headers.get('Content-Length', 0))
        d = json.loads(s.rfile.read(n))
        img = base64.b64decode(d['image'])
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            f.write(img); p = f.name
        r = subprocess.run(['tesseract', p, 'stdout', '--psm', '7', '-l', 'eng'],
                         capture_output=True, text=True, timeout=15)
        os.unlink(p)
        t = r.stdout.strip().replace(' ','').replace('\n','')
        s.send_response(200)
        s.send_header('Content-Type', 'application/json')
        s.end_headers()
        s.wfile.write(json.dumps({'success': bool(t), 'text': t}).encode())
    def log_message(s, *a): pass

HTTPServer(('127.0.0.1', 19999), H).serve_forever()
