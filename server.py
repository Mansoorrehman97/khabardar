#!/usr/bin/env python3
"""
Khabardar demo server — flood early warning to every phone.

Zero dependencies: Python 3.9+ standard library only.
  python server.py            -> http://localhost:8000/dashboard  (officer)
                                 http://<your-LAN-IP>:8000/phone   (phones on the same Wi-Fi / hotspot)

Real-time links use Server-Sent Events (SSE). Live rain comes from the Open-Meteo forecast API and
live river discharge from the GloFAS model via the Open-Meteo Flood API (both free, no key).
"""
import json
import math
import os
import queue
import socket
import threading
import time
import uuid
import base64
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(ROOT, "static")
DATA = os.path.join(ROOT, "data")
PKT = timezone(timedelta(hours=5))  # Pakistan Standard Time (no DST)


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


CONFIG = load_json(os.path.join(ROOT, "config.json"), {})
VILLAGES = load_json(os.path.join(DATA, "villages.json"), {"villages": []})["villages"]
VMAP = {v["id"]: v for v in VILLAGES}
CACHE_SECONDS = int(CONFIG.get("live_cache_seconds", 600))

# ----------------------------------------------------------------------------------------------
# In-memory demo state
# ----------------------------------------------------------------------------------------------
lock = threading.RLock()
phones = {}          # phone_id -> {id, name, villages, lang, lat, lon, device, joined, last_seen, connected}
alerts = []          # [{id, t, level, villages, test, recipients}]
responses = {}       # "alert_id|phone_id" -> {alert_id, phone_id, status, t_sent, t_delivered, t_played, t_response, lat, lon}
event_log = []       # recent log entries
phone_streams = {}   # phone_id -> set(queue)
dash_streams = set() # queues
scenario = {}        # village_id -> True when a TEST heavy-rain scenario is switched on
live_cache = {"t": 0, "data": None, "source": "not loaded yet", "error": None}

LEVELS = ["normal", "watch", "warning", "evacuate"]

# Alert texts. NOTE: Pashto and Sindhi wording must be checked by native speakers before the pitch.
TITLES = {
    "watch":    {"en": "FLOOD WATCH",    "ur": "سیلاب سے ہوشیار",   "ps": "د سېلاب پام",      "sd": "ٻوڏ کان هوشيار"},
    "warning":  {"en": "FLOOD WARNING",  "ur": "سیلاب کا انتباہ",   "ps": "د سېلاب خبرداری",  "sd": "ٻوڏ جي خبرداري"},
    "evacuate": {"en": "EVACUATE NOW",   "ur": "فوراً گھر خالی کریں", "ps": "سمدستي کور پرېږدئ", "sd": "فوري گهر خالي ڪريو"},
}
BODY_PREPARE = {
    "en": "Khabardar! Flood danger is rising in {village}. Be ready to move to {safe} on higher ground. Keep family, papers and medicines ready.",
    "ur": "خبردار! {village} میں سیلاب کا خطرہ بڑھ رہا ہے۔ اونچی جگہ {safe} جانے کے لیے تیار رہیں۔ گھر والوں، کاغذات اور دوائیوں کو تیار رکھیں۔",
    "ps": "خبردار! په {village} کې د سېلاب خطر زیاتېږي. لوړ ځای {safe} ته د تلو لپاره تیار اوسئ. کورنۍ، کاغذونه او درمل تیار وساتئ.",
    "sd": "خبردار! {village} ۾ ٻوڏ جو خطرو وڌي رهيو آهي. مٿانهين جاءِ {safe} ڏانهن وڃڻ لاءِ تيار رهو. گهر ڀاتين، ڪاغذن ۽ دوائن کي تيار رکو.",
}
BODY_GO = {
    "en": "Khabardar! Flood is coming to {village}. Go NOW to {safe} on higher ground. Take family, papers and medicines.",
    "ur": "خبردار! {village} میں سیلاب آ رہا ہے۔ فوراً اونچی جگہ {safe} پہنچیں۔ گھر والوں، کاغذات اور دوائیوں کو ساتھ لیں۔",
    "ps": "خبردار! په {village} کې د سېلاب خطر دی. ژر تر ژره لوړ ځای {safe} ته لاړ شئ. کورنۍ، کاغذونه او درمل له ځانه سره واخلئ.",
    "sd": "خبردار! {village} ۾ ٻوڏ جو خطرو آهي. جلدي مٿانهين جاءِ {safe} تي پهچو. گهر ڀاتين، ڪاغذن ۽ دوائن کي ساڻ کڻو.",
}


def build_texts(level, village):
    body = BODY_PREPARE if level == "watch" else BODY_GO
    out = {}
    for lang in ("en", "ur", "ps", "sd"):
        vname = village["name"] if lang == "en" else village.get("name_ur", village["name"])
        sname = village["safe"]["name"] if lang == "en" else village["safe"].get("name_ur", village["safe"]["name"])
        out[lang] = {"title": TITLES[level][lang], "body": body[lang].format(village=vname, safe=sname)}
    return out


# ----------------------------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------------------------
def now():
    return time.time()


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def sse(event, data):
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n".encode("utf-8")


def push_dash(event, data):
    msg = sse(event, data)
    with lock:
        qs = list(dash_streams)
    for q in qs:
        q.put(msg)


def push_phone(pid, event, data):
    msg = sse(event, data)
    with lock:
        qs = list(phone_streams.get(pid, ()))
    for q in qs:
        q.put(msg)
    return len(qs)


def add_log(kind, text, **extra):
    entry = {"t": now(), "kind": kind, "text": text}
    entry.update(extra)
    with lock:
        event_log.append(entry)
        del event_log[:-300]
    push_dash("log", entry)


def phone_public(p):
    return {k: p.get(k) for k in ("id", "name", "villages", "lang", "lat", "lon", "device", "joined", "last_seen", "connected", "sim")}


def add_simulated_phones(count, village_ids):
    """Clearly-labelled SIMULATED phones, to show the dashboard at scale during the demo."""
    import random
    village_ids = [v for v in village_ids if v in VMAP] or [VILLAGES[0]["id"]]
    created = []
    with lock:
        for i in range(count):
            vid = random.choice(village_ids)
            v = VMAP[vid]
            pid = "sim" + uuid.uuid4().hex[:10]
            phones[pid] = {"id": pid, "name": f"Simulated {len([p for p in phones.values() if p.get('sim')]) + 1}",
                           "villages": [vid], "lang": random.choice(["ur", "ps", "ur", "sd"]),
                           "lat": v["lat"] + random.uniform(-0.015, 0.015), "lon": v["lon"] + random.uniform(-0.018, 0.018),
                           "device": "simulated", "joined": now(), "last_seen": now(), "connected": True, "sim": True}
            created.append(phone_public(phones[pid]))
    for p in created:
        push_dash("phone", p)
    add_log("sim", f"Added {count} SIMULATED phones around {', '.join(VMAP[v]['name'] for v in village_ids)}")
    return created


def simulate_responses(alert_id, pids):
    import random
    def run(pid):
        time.sleep(random.uniform(0.4, 1.5))
        record_ack({"id": pid, "alert_id": alert_id, "stage": "delivered"})
        time.sleep(random.uniform(0.5, 2.0))
        record_ack({"id": pid, "alert_id": alert_id, "stage": "played"})
        time.sleep(random.uniform(4, 22))
        record_response({"id": pid, "alert_id": alert_id, "status": "help" if random.random() < 0.12 else "safe"})
    for pid in pids:
        threading.Thread(target=run, args=(pid,), daemon=True).start()


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
            if not ip.startswith("127."):
                ips.add(ip)
    except OSError:
        pass
    return sorted(ips)


# ----------------------------------------------------------------------------------------------
# Live data (Open-Meteo forecast + GloFAS via Open-Meteo Flood API) and the risk engine
# ----------------------------------------------------------------------------------------------
def fetch_json(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": "khabardar-hackathon-demo/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def _median(values):
    vals = sorted(v for v in values if isinstance(v, (int, float)))
    if not vals:
        return None
    n = len(vals)
    return vals[n // 2] if n % 2 else (vals[n // 2 - 1] + vals[n // 2]) / 2


def fetch_live_raw():
    lats = ",".join(str(v["lat"]) for v in VILLAGES)
    lons = ",".join(str(v["lon"]) for v in VILLAGES)
    fc_url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode({
        "latitude": lats, "longitude": lons, "hourly": "precipitation",
        "daily": "precipitation_sum", "forecast_days": 3, "timezone": "Asia/Karachi"}, safe=",")
    fl_url = "https://flood-api.open-meteo.com/v1/flood?" + urllib.parse.urlencode({
        "latitude": lats, "longitude": lons, "daily": "river_discharge",
        "past_days": 30, "forecast_days": 7}, safe=",")
    fc = fetch_json(fc_url)
    try:
        fl = fetch_json(fl_url)
    except Exception as e:  # river data is optional; rain still works
        fl = None
        add_log("data", f"River data unavailable: {e}")
    if isinstance(fc, dict):
        fc = [fc]
    if isinstance(fl, dict):
        fl = [fl]
    return fc, fl


def summarise(fc_item, fl_item):
    hour_key = datetime.now(PKT).strftime("%Y-%m-%dT%H:00")
    today_key = datetime.now(PKT).strftime("%Y-%m-%d")
    out = {"rain_24h": None, "rain_max_1h": None, "rain_72h": None,
           "river_now": None, "river_peak_3d": None, "river_normal": None, "river_ratio": None}
    try:
        times = fc_item["hourly"]["time"]
        pr = fc_item["hourly"]["precipitation"]
        i = times.index(hour_key) if hour_key in times else 0
        nxt = [x for x in pr[i:i + 24] if isinstance(x, (int, float))]
        out["rain_24h"] = round(sum(nxt), 1) if nxt else 0.0
        out["rain_max_1h"] = round(max(nxt), 1) if nxt else 0.0
        daily = [x for x in fc_item["daily"]["precipitation_sum"] if isinstance(x, (int, float))]
        out["rain_72h"] = round(sum(daily), 1) if daily else 0.0
    except (KeyError, TypeError, ValueError):
        pass
    if fl_item:
        try:
            dtimes = fl_item["daily"]["time"]
            q = fl_item["daily"]["river_discharge"]
            ti = dtimes.index(today_key) if today_key in dtimes else max(0, len(dtimes) - 7)
            past = q[:ti]
            fut = [x for x in q[ti:ti + 3] if isinstance(x, (int, float))]
            normal = _median(past)
            out["river_now"] = q[ti] if ti < len(q) else None
            out["river_peak_3d"] = max(fut) if fut else None
            out["river_normal"] = round(normal, 1) if normal is not None else None
            if normal and out["river_peak_3d"] is not None and normal > 0:
                out["river_ratio"] = round(out["river_peak_3d"] / normal, 2)
        except (KeyError, TypeError, ValueError):
            pass
    return out


def score_of(s):
    rain_score = (s.get("rain_max_1h") or 0) * 6 + (s.get("rain_24h") or 0) * 1.2
    ratio = s.get("river_ratio")
    river_score = 0 if ratio is None else max(0.0, (ratio - 1.0) * 60)
    score = int(round(min(100, max(rain_score, river_score))))
    level = "normal" if score < 30 else "watch" if score < 55 else "warning" if score < 80 else "evacuate"
    driver = "rain" if rain_score >= river_score else "river"
    return score, level, driver


def get_live(force=False):
    with lock:
        fresh = live_cache["data"] is not None and now() - live_cache["t"] < CACHE_SECONDS
    if force or not fresh:
        try:
            fc, fl = fetch_live_raw()
            base = {}
            for idx, v in enumerate(VILLAGES):
                base[v["id"]] = summarise(fc[idx] if idx < len(fc) else {}, fl[idx] if fl and idx < len(fl) else None)
            with lock:
                live_cache.update(t=now(), data=base, source="live", error=None)
        except Exception as e:
            with lock:
                live_cache["error"] = str(e)
                if live_cache["data"] is None:
                    live_cache["data"] = {v["id"]: summarise({}, None) for v in VILLAGES}
                    live_cache["source"] = "offline — no internet, live values unavailable"
                    live_cache["t"] = now() - CACHE_SECONDS + 60  # retry in a minute
                else:
                    live_cache["source"] = "cached (last good data)"
            add_log("data", f"Live data fetch failed: {e}")
    with lock:
        base = live_cache["data"]
        result = {"source": live_cache["source"], "fetched_at": live_cache["t"], "error": live_cache["error"], "villages": {}}
        for v in VILLAGES:
            s = dict(base.get(v["id"], {}))
            test = bool(scenario.get(v["id"]))
            if test:  # TEST scenario: simulated heavy rain + river rise, clearly flagged
                s.update(rain_24h=165.0, rain_max_1h=58.0, rain_72h=240.0, river_ratio=3.4)
            score, level, driver = score_of(s)
            s.update(score=score, level=level, driver=driver, test=test)
            result["villages"][v["id"]] = s
    return result


# ----------------------------------------------------------------------------------------------
# Alerts, delivery receipts and responses
# ----------------------------------------------------------------------------------------------
def phone_matches(p, village_ids, center=None, radius_km=None):
    """Return the village id this phone should be warned for, or None."""
    for vid in p.get("villages", []):
        if vid in village_ids:
            return vid
    if center and radius_km and p.get("lat") is not None and p.get("lon") is not None:
        if haversine_km(center[0], center[1], p["lat"], p["lon"]) <= radius_km:
            nearest = min(VILLAGES, key=lambda v: haversine_km(v["lat"], v["lon"], p["lat"], p["lon"]))
            return nearest["id"]
    return None


def alert_payload(alert, vid, p):
    v = VMAP[vid]
    return {"alert_id": alert["id"], "t": alert["t"], "level": alert["level"], "test": alert["test"],
            "village": {"id": vid, "name": v["name"], "name_ur": v.get("name_ur"), "lat": v["lat"], "lon": v["lon"]},
            "safe": v["safe"], "texts": build_texts(alert["level"], v), "lang": p.get("lang", "ur")}


def send_alert(body):
    level = body.get("level", "warning")
    if level not in TITLES:
        level = "warning"
    village_ids = [vid for vid in body.get("village_ids", []) if vid in VMAP]
    center = body.get("center")
    radius_km = body.get("radius_km")
    if center and radius_km:
        for v in VILLAGES:
            if haversine_km(center[0], center[1], v["lat"], v["lon"]) <= float(radius_km) and v["id"] not in village_ids:
                village_ids.append(v["id"])
    if not village_ids and not (center and radius_km):
        return {"ok": False, "error": "Choose at least one village or draw a zone."}
    alert = {"id": uuid.uuid4().hex[:8], "t": now(), "level": level, "villages": village_ids,
             "center": center, "radius_km": radius_km, "test": bool(body.get("test", True)), "recipients": 0}
    recipients = []
    with lock:
        alerts.append(alert)
        plist = list(phones.values())
    for p in plist:
        vid = phone_matches(p, village_ids, center, float(radius_km) if radius_km else None)
        if not vid:
            continue
        key = f"{alert['id']}|{p['id']}"
        with lock:
            responses[key] = {"alert_id": alert["id"], "phone_id": p["id"], "village_id": vid, "status": "sent",
                              "t_sent": now(), "t_delivered": None, "t_played": None, "t_response": None,
                              "lat": p.get("lat"), "lon": p.get("lon")}
        push_phone(p["id"], "alert", alert_payload(alert, vid, p))
        recipients.append(p["id"])
    alert["recipients"] = len(recipients)
    with lock:
        sim_ids = [pid for pid in recipients if phones.get(pid, {}).get("sim")]
    if sim_ids:
        simulate_responses(alert["id"], sim_ids)
    names = ", ".join(VMAP[v]["name"] for v in village_ids) or "drawn zone"
    add_log("alert", f"{level.upper()} sent to {len(recipients)} phone(s) — {names}" + (" [TEST]" if alert["test"] else ""))
    push_dash("alert_sent", {"alert": alert, "recipients": recipients})
    if village_ids:
        threading.Thread(target=send_sms, args=(alert, village_ids), daemon=True).start()
    return {"ok": True, "alert": alert, "recipients": len(recipients)}


def send_sms(alert, village_ids):
    sms = CONFIG.get("sms", {})
    v = VMAP[village_ids[0]]
    text = build_texts(alert["level"], v)["en"]
    text = f"{text['title']}: {text['body']}" + (" [TEST]" if alert["test"] else "")
    if not sms.get("enabled"):
        add_log("sms", f"SMS fallback (simulated — gateway not configured): \"{text[:80]}…\"")
        return
    try:
        payload = json.dumps({"message": text, "phoneNumbers": sms.get("numbers", [])}).encode("utf-8")
        req = urllib.request.Request(sms["url"], data=payload, headers={"Content-Type": "application/json"})
        if sms.get("username"):
            token = base64.b64encode(f"{sms['username']}:{sms.get('password', '')}".encode()).decode()
            req.add_header("Authorization", f"Basic {token}")
        with urllib.request.urlopen(req, timeout=10) as r:
            add_log("sms", f"SMS sent via gateway to {len(sms.get('numbers', []))} number(s) (HTTP {r.status})")
    except Exception as e:
        add_log("sms", f"SMS gateway error: {e}")


def record_ack(body):
    key = f"{body.get('alert_id')}|{body.get('id')}"
    stage = body.get("stage")
    with lock:
        r = responses.get(key)
        if not r:
            return {"ok": False}
        if stage == "delivered" and not r["t_delivered"]:
            r["t_delivered"] = now()
            if r["status"] == "sent":
                r["status"] = "delivered"
        elif stage == "played" and not r["t_played"]:
            r["t_played"] = now()
            if r["status"] in ("sent", "delivered"):
                r["status"] = "played"
        snap = dict(r)
    push_dash("response", snap)
    return {"ok": True}


def record_response(body):
    key = f"{body.get('alert_id')}|{body.get('id')}"
    status = body.get("status")
    if status not in ("safe", "help"):
        return {"ok": False, "error": "status must be safe or help"}
    with lock:
        r = responses.get(key)
        if not r:
            return {"ok": False, "error": "unknown alert"}
        r["status"] = status
        r["t_response"] = now()
        if body.get("lat") is not None:
            r["lat"], r["lon"] = body.get("lat"), body.get("lon")
        snap = dict(r)
        p = phones.get(body.get("id"), {})
    who = p.get("name") or f"Phone {body.get('id', '')[:4]}"
    add_log("response", f"{who} — {'SAFE' if status == 'safe' else 'NEEDS HELP'} ({VMAP[snap['village_id']]['name']})")
    push_dash("response", snap)
    return {"ok": True}


def join_phone(body):
    pid = (body.get("id") or uuid.uuid4().hex)[:32]
    villages = [v for v in body.get("villages", []) if v in VMAP][:3]
    with lock:
        p = phones.get(pid, {"id": pid, "joined": now(), "connected": False})
        p.update(name=(body.get("name") or "")[:40], villages=villages, lang=body.get("lang", "ur"),
                 lat=body.get("lat"), lon=body.get("lon"), device=(body.get("device") or "")[:60], last_seen=now())
        phones[pid] = p
        snap = phone_public(p)
    push_dash("phone", snap)
    add_log("join", f"{snap['name'] or 'A phone'} joined — watching {', '.join(VMAP[v]['name'] for v in villages) or 'no village'}")
    return {"ok": True, "id": pid}


def state_snapshot():
    with lock:
        return {"phones": [phone_public(p) for p in phones.values()], "alerts": alerts[-20:],
                "responses": list(responses.values()), "log": event_log[-80:], "scenario": dict(scenario)}


# ----------------------------------------------------------------------------------------------
# HTTP handler
# ----------------------------------------------------------------------------------------------
CTYPES = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
          ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
          ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".ico": "image/x-icon"}


class Handler(BaseHTTPRequestHandler):
    server_version = "Khabardar/1.0"

    def log_message(self, fmt, *args):
        if "/events/" in self.path or "/api/live" in self.path or "/api/state" in self.path:
            return
        super().log_message(fmt, *args)

    # -- utilities --
    def send_json(self, obj, code=200):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def read_body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > 100_000:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return {}

    def serve_file(self, rel):
        path = os.path.normpath(os.path.join(STATIC, rel))
        if not path.startswith(STATIC) or not os.path.isfile(path):
            self.send_error(404)
            return
        with open(path, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", CTYPES.get(os.path.splitext(path)[1].lower(), "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def stream(self, kind, pid=None):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        q = queue.Queue()
        with lock:
            if kind == "dash":
                dash_streams.add(q)
            else:
                phone_streams.setdefault(pid, set()).add(q)
                if pid in phones:
                    phones[pid]["connected"] = True
                    phones[pid]["last_seen"] = now()
        if kind == "phone" and pid in phones:
            push_dash("phone", phone_public(phones[pid]))
            self.replay_active_alerts(pid, q)
        try:
            self.wfile.write(b"retry: 3000\n\n")
            self.wfile.write(sse("hello", {"server_time": now()}))
            self.wfile.flush()
            while True:
                try:
                    msg = q.get(timeout=15)
                except queue.Empty:
                    msg = b": ping\n\n"
                self.wfile.write(msg)
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            pass
        finally:
            with lock:
                if kind == "dash":
                    dash_streams.discard(q)
                else:
                    s = phone_streams.get(pid, set())
                    s.discard(q)
                    if not s and pid in phones:
                        phones[pid]["connected"] = False
            if kind == "phone" and pid in phones:
                push_dash("phone", phone_public(phones[pid]))

    def replay_active_alerts(self, pid, q):
        """A phone that (re)connects still gets any alert from the last 30 minutes it has not answered."""
        with lock:
            p = phones.get(pid)
            recent = [a for a in alerts if now() - a["t"] < 1800]
            todo = []
            for a in recent:
                r = responses.get(f"{a['id']}|{pid}")
                if r and r["status"] not in ("safe", "help"):
                    todo.append((a, r["village_id"]))
        for a, vid in todo[-1:]:
            q.put(sse("alert", alert_payload(a, vid, p)))

    # -- routes --
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        path, qs = url.path, urllib.parse.parse_qs(url.query)
        if path in ("/", "/index.html"):
            self.send_response(302)
            self.send_header("Location", "/phone")
            self.end_headers()
        elif path == "/phone":
            self.serve_file("phone.html")
        elif path == "/dashboard":
            self.serve_file("dashboard.html")
        elif path.startswith("/static/"):
            self.serve_file(path[len("/static/"):])
        elif path == "/api/villages":
            self.send_json({"villages": VILLAGES})
        elif path == "/api/live":
            self.send_json(get_live(force=qs.get("refresh", ["0"])[0] == "1"))
        elif path == "/api/state":
            self.send_json(state_snapshot())
        elif path == "/api/preview":
            vid = qs.get("village", [""])[0]
            level = qs.get("level", ["warning"])[0]
            if vid not in VMAP or level not in TITLES:
                self.send_json({"ok": False}, 400)
            else:
                self.send_json({"ok": True, "texts": build_texts(level, VMAP[vid])})
        elif path == "/api/info":
            port = self.server.server_address[1]
            host = self.headers.get("Host", "")
            if host and not host.startswith(("localhost", "127.", "[::1]")):
                # opened through a public address (cloud or LAN IP): that same address is the join link
                scheme = "https" if self.headers.get("X-Forwarded-Proto", "").startswith("https") else "http"
                urls = [f"{scheme}://{host}/phone"]
            else:
                urls = [f"http://{ip}:{port}/phone" for ip in lan_ips()]
            self.send_json({"join_urls": urls})
        elif path == "/events/dashboard":
            self.stream("dash")
        elif path == "/events/phone":
            pid = (qs.get("id", [""])[0])[:32]
            if not pid:
                self.send_error(400)
                return
            self.stream("phone", pid)
        else:
            self.send_error(404)

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        body = self.read_body()
        if path == "/api/join":
            self.send_json(join_phone(body))
        elif path == "/api/alert":
            self.send_json(send_alert(body))
        elif path == "/api/ack":
            self.send_json(record_ack(body))
        elif path == "/api/respond":
            self.send_json(record_response(body))
        elif path == "/api/scenario":
            vid = body.get("village_id")
            if vid in VMAP:
                with lock:
                    if body.get("on"):
                        scenario[vid] = True
                    else:
                        scenario.pop(vid, None)
                add_log("scenario", f"TEST heavy-rain scenario {'ON' if body.get('on') else 'OFF'} for {VMAP[vid]['name']} (simulated values)")
                push_dash("live_changed", {})
            self.send_json({"ok": True, "scenario": dict(scenario)})
        elif path == "/api/simulate":
            count = max(1, min(60, int(body.get("count", 25))))
            created = add_simulated_phones(count, body.get("village_ids", []))
            self.send_json({"ok": True, "created": len(created)})
        elif path == "/api/reset":
            with lock:
                alerts.clear()
                responses.clear()
                scenario.clear()
                event_log.clear()
                for pid in [k for k, p in phones.items() if p.get("sim")]:
                    del phones[pid]
            push_dash("reset", {})
            for pid in list(phone_streams):
                push_phone(pid, "reset", {})
            add_log("system", "Demo reset — alerts, responses and test scenarios cleared")
            self.send_json({"ok": True})
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
        import sys
        if isinstance(sys.exc_info()[1], (ConnectionAbortedError, ConnectionResetError, BrokenPipeError)):
            return  # a phone closed its page or lost signal — normal, not an error
        super().handle_error(request, client_address)


def main():
    port = int(os.environ.get("PORT", CONFIG.get("port", 8000)))

    class Server4(Server):
        address_family = socket.AF_INET

    if os.environ.get("PORT"):  # cloud host (Render, Railway, ...): plain IPv4 is the safe choice
        server = Server4(("0.0.0.0", port), Handler)
    else:
        try:
            server = Server(("::", port), Handler)
        except OSError:  # no IPv6 on this machine
            server = Server4(("0.0.0.0", port), Handler)
    threading.Thread(target=get_live, daemon=True).start()  # warm the live-data cache
    print("\n  KHABARDAR demo server is running\n")
    print(f"  Officer dashboard : http://localhost:{port}/dashboard")
    for ip in lan_ips():
        print(f"  Phones join at    : http://{ip}:{port}/phone   (same Wi-Fi / hotspot)")
    print("\n  Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
