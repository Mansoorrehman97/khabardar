#!/usr/bin/env python3
"""
Khabardar — local network edition (for the live pitch).

Zero dependencies: Python 3.9+ standard library only.
    python server.py   ->  control room: http://localhost:8000/dashboard.html
                           phones:       http://<laptop-IP>:8000/phone.html?room=...  (QR code in the control room)

It serves the same app as the online edition (folder web/) and runs its own small message relay, so the control
room and phones talk through the laptop instead of the internet. The relay speaks the same simple protocol as
ntfy.sh (POST /relay/<topic>, GET /relay/<topic>/sse?since=...), so the app code is identical in both editions.
Live rain, river and NASA data are still fetched by each browser from the internet.
"""
import base64
import collections
import json
import os
import queue
import re
import socket
import sys
import threading
import time
import urllib.parse
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(ROOT, "web")


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, ValueError):
        return default


CONFIG = load_json(os.path.join(ROOT, "config.json"), {})
KEEP_SECONDS = 12 * 3600          # how long the relay keeps messages (same as ntfy.sh)
MAX_PER_TOPIC = 5000
MAX_BODY = 8192

# ----------------------------------------------------------------------------------------------
# Relay: topic -> recent messages, and live subscribers
# ----------------------------------------------------------------------------------------------
lock = threading.RLock()
history = collections.defaultdict(lambda: collections.deque(maxlen=MAX_PER_TOPIC))
subscribers = collections.defaultdict(set)
TOPIC_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
CONTROL_TYPES = {"alert", "reset", "scenario", "rescue", "allclear"}


def publish(topic, body):
    msg = {"id": uuid.uuid4().hex[:12], "time": round(time.time(), 3), "event": "message", "topic": topic, "message": body}
    line = ("data: " + json.dumps(msg, ensure_ascii=False) + "\n\n").encode("utf-8")
    with lock:
        h = history[topic]
        h.append(msg)
        cutoff = time.time() - KEEP_SECONDS
        while h and h[0]["time"] < cutoff:
            h.popleft()
        subs = list(subscribers[topic])
    for q in subs:
        q.put(line)
    on_message(body)
    return msg


def since_messages(topic, since):
    with lock:
        msgs = list(history.get(topic, ()))
    if not since:
        return []
    if since == "all":
        return msgs
    m = re.fullmatch(r"(\d+)([smhd])", since)
    if m:
        cutoff = time.time() - int(m.group(1)) * {"s": 1, "m": 60, "h": 3600, "d": 86400}[m.group(2)]
        return [x for x in msgs if x["time"] >= cutoff]
    if since.isdigit():
        return [x for x in msgs if x["time"] >= int(since)]
    for i, x in enumerate(msgs):  # a message id: everything after it
        if x["id"] == since:
            return msgs[i + 1:]
    return msgs


# ----------------------------------------------------------------------------------------------
# Optional SMS gateway for keypad phones (simulated unless configured in config.json)
# ----------------------------------------------------------------------------------------------
def on_message(body):
    try:
        m = json.loads(body)
    except ValueError:
        return
    if isinstance(m, dict) and m.get("type") == "alert":
        threading.Thread(target=send_sms, args=(m,), daemon=True).start()


def send_sms(alert):
    sms = CONFIG.get("sms", {})
    places = ", ".join(alert.get("villages", [])) or "drawn zone"
    text = (f"KHABARDAR {str(alert.get('level', 'warning')).upper()}: flood alert for {places}. "
            f"Go to the safe point on higher ground. Reply 1 = safe, 2 = need help." + (" [DEMO]" if alert.get("test") else ""))
    if not sms.get("enabled"):
        print(f"  [SMS simulated — no gateway configured] {text[:110]}")
        return
    try:
        payload = json.dumps({"message": text, "phoneNumbers": sms.get("numbers", [])}).encode("utf-8")
        req = urllib.request.Request(sms["url"], data=payload, headers={"Content-Type": "application/json"})
        if sms.get("username"):
            token = base64.b64encode(f"{sms['username']}:{sms.get('password', '')}".encode()).decode()
            req.add_header("Authorization", f"Basic {token}")
        with urllib.request.urlopen(req, timeout=10) as r:
            print(f"  [SMS] sent via gateway to {len(sms.get('numbers', []))} number(s) (HTTP {r.status})")
    except Exception as e:  # noqa: BLE001 - report any gateway problem and carry on
        print(f"  [SMS] gateway error: {e}")


def mask_number(num):
    num = re.sub(r"[^\d+]", "", str(num or ""))
    return num[:5] + "*****" + num[-2:] if len(num) > 7 else (num or "unknown number")


def incoming_sms(sender, text):
    """An SMS reached the gateway phone (any phone can send it, even a keypad phone without internet).
    It is passed to every control room that was active in the last 12 hours; the control room reads it
    (e.g. "MADAD Dadu 5 zakhmi") and adds a help request to the rescue queue."""
    text = str(text or "").strip()[:300]
    if not text:
        return 0
    body = json.dumps({"type": "sms_in", "from": mask_number(sender), "text": text, "t": time.time()}, ensure_ascii=False)
    room = CONFIG.get("sms", {}).get("room")
    with lock:
        cutoff = time.time() - KEEP_SECONDS
        topics = [room and "khabardar-" + room] if room else [t for t, h in history.items() if h and h[-1]["time"] >= cutoff and t.startswith("khabardar-")]
    for topic in topics:
        publish(topic, body)
    print(f"  [SMS in] {mask_number(sender)}: {text[:80]}  -> {len(topics)} control room(s)")
    return len(topics)


# ----------------------------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------------------------
def lan_ips():
    ips = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))  # no packets are sent; this only picks the outgoing interface
        ips.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith(("127.", "169.254.")):
                ips.add(ip)
    except OSError:
        pass
    return sorted(ips)


CTYPES = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/plain; charset=utf-8",
          ".txt": "text/plain; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
          ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".ico": "image/x-icon"}


class Handler(BaseHTTPRequestHandler):
    server_version = "Khabardar/2.0"

    def log_message(self, fmt, *args):
        if "/relay/" in self.path or self.path.endswith((".js", ".css", ".png", ".ico")):
            return
        super().log_message(fmt, *args)

    def from_this_laptop(self):
        ip = str(self.client_address[0]).replace("::ffff:", "")
        return ip in ("127.0.0.1", "::1") or ip in lan_ips()

    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def send_bytes(self, data, ctype, code=200, cache="no-cache"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", cache)
        self.cors()
        self.end_headers()
        self.wfile.write(data)

    def config_js(self):
        host = self.headers.get("Host", "")
        port = self.server.server_address[1]
        if host and not host.startswith(("localhost", "127.", "[::1]")):
            scheme = "https" if self.headers.get("X-Forwarded-Proto", "").startswith("https") else "http"
            join = f"{scheme}://{host}"          # opened through a LAN IP or a public address: phones use the same
        else:
            ips = lan_ips()
            join = f"http://{ips[0]}:{port}" if ips else None
        cfg = {"relay": "/relay", "edition": "local", "joinBase": join}
        self.send_bytes(("window.KHABARDAR = " + json.dumps(cfg) + ";\n").encode("utf-8"), CTYPES[".js"], cache="no-store")

    def serve_file(self, rel):
        path = os.path.normpath(os.path.join(WEB, rel.lstrip("/")))
        if not path.startswith(WEB) or not os.path.isfile(path):
            self.send_error(404)
            return
        with open(path, "rb") as f:
            data = f.read()
        self.send_bytes(data, CTYPES.get(os.path.splitext(path)[1].lower(), "application/octet-stream"))

    def stream(self, topic, since):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.cors()
        self.end_headers()
        q = queue.Queue()
        with lock:
            backlog = since_messages(topic, since)
            subscribers[topic].add(q)
        try:
            self.wfile.write(b"retry: 3000\n\n")
            self.wfile.write(("data: " + json.dumps({"event": "open", "topic": topic, "time": time.time()}) + "\n\n").encode())
            for m in backlog:
                self.wfile.write(("data: " + json.dumps(m, ensure_ascii=False) + "\n\n").encode("utf-8"))
            self.wfile.flush()
            while True:
                try:
                    line = q.get(timeout=25)
                except queue.Empty:
                    line = ("data: " + json.dumps({"event": "keepalive", "time": time.time()}) + "\n\n").encode()
                self.wfile.write(line)
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            pass
        finally:
            with lock:
                subscribers[topic].discard(q)

    # -- routes --
    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        path, qs = url.path, urllib.parse.parse_qs(url.query)
        parts = path.strip("/").split("/")
        if path in ("/", ""):
            self.serve_file("index.html")
        elif path in ("/dashboard", "/phone"):           # old short links keep working
            self.send_response(302)
            self.send_header("Location", path + ".html" + (("?" + url.query) if url.query else ""))
            self.end_headers()
        elif path == "/js/config.js":
            self.config_js()
        elif path == "/health":
            self.send_bytes(b'{"ok":true}', CTYPES[".json"])
        elif len(parts) == 3 and parts[0] == "relay" and parts[2] == "sse" and TOPIC_RE.match(parts[1]):
            self.stream(parts[1], qs.get("since", [""])[0])
        else:
            self.serve_file(path)

    def do_POST(self):
        parts = urllib.parse.urlparse(self.path).path.strip("/").split("/")
        if parts == ["sms", "incoming"]:
            # webhook for an Android SMS-gateway app: JSON {"from": "...", "message": "..."} or a form with the same fields
            n = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(n).decode("utf-8", "replace") if 0 < n <= MAX_BODY else ""
            try:
                data = json.loads(raw)
                data = data.get("payload", data) if isinstance(data, dict) else {}
            except ValueError:
                data = {k: v[0] for k, v in urllib.parse.parse_qs(raw).items()}
            sender = data.get("from") or data.get("sender") or data.get("phoneNumber") or data.get("phone") or ""
            text = data.get("message") or data.get("text") or data.get("body") or ""
            rooms = incoming_sms(sender, text)
            self.send_bytes(json.dumps({"ok": bool(text), "rooms": rooms}).encode(), CTYPES[".json"])
            return
        if len(parts) == 2 and parts[0] == "relay" and TOPIC_RE.match(parts[1]):
            n = int(self.headers.get("Content-Length") or 0)
            if n <= 0 or n > MAX_BODY:
                self.send_bytes(b'{"error":"empty or too large"}', CTYPES[".json"], 413)
                return
            body = self.rfile.read(n).decode("utf-8", "replace")
            # protection against fake alerts: only the control room on this laptop may send alerts, resets, rescues
            # and all-clears; phones on the Wi-Fi may only send their own answers, receipts and reports
            try:
                mtype = json.loads(body).get("type")
            except (ValueError, AttributeError):
                mtype = None
            if mtype in CONTROL_TYPES and (not self.from_this_laptop() or self.headers.get("X-Khabardar-Untrusted")):
                print(f"  [BLOCKED] a '{mtype}' message from {self.client_address[0]} — only the control room on this laptop may send it")
                self.send_bytes(b'{"error":"only the control room may send this"}', CTYPES[".json"], 403)
                return
            msg = publish(parts[1], body)
            self.send_bytes(json.dumps(msg, ensure_ascii=False).encode("utf-8"), CTYPES[".json"])
        else:
            self.send_error(404)


class Server(ThreadingHTTPServer):
    """Dual-stack (IPv6 + IPv4) so 'localhost' connects instantly on Windows."""
    daemon_threads = True
    address_family = socket.AF_INET6

    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except (AttributeError, OSError):
            pass
        super().server_bind()

    def handle_error(self, request, client_address):
        if isinstance(sys.exc_info()[1], (ConnectionAbortedError, ConnectionResetError, BrokenPipeError)):
            return  # a phone closed its page or lost signal — normal, not an error
        super().handle_error(request, client_address)


class Server4(Server):
    address_family = socket.AF_INET


def main():
    port = int(os.environ.get("PORT", CONFIG.get("port", 8000)))
    if os.environ.get("PORT"):  # cloud host: plain IPv4 is the safe choice
        server = Server4(("0.0.0.0", port), Handler)
    else:
        try:
            server = Server(("::", port), Handler)
        except OSError:  # no IPv6 on this machine
            server = Server4(("0.0.0.0", port), Handler)
    print("\n  KHABARDAR — local network edition is running\n")
    print(f"  Control room (this laptop): http://localhost:{port}/dashboard.html")
    for ip in lan_ips():
        print(f"  Phones on the same Wi-Fi / hotspot: http://{ip}:{port}  (scan the QR code in the control room)")
    print("\n  Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
