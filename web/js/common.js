/* Khabardar — shared logic for the control room and phones (runs in the browser).
   Live data: Open-Meteo forecast + GloFAS river discharge (Open-Meteo Flood API) + NASA satellite layers (nasa.js).
   Real-time link: a relay topic per "room" — ntfy.sh online, or the laptop's own relay when run with server.py.
   Languages: Urdu and English. */

const CFG = Object.assign({ relay: "https://ntfy.sh", edition: "online", joinBase: null }, window.KHABARDAR || {});
const VMAP = Object.fromEntries(VILLAGES.map((v) => [v.id, v]));
const LANGS = ["ur", "en"];
const LANG_NAMES = { ur: "اردو", en: "English" };

const TITLES = {
  watch:    { en: "FLOOD WATCH",   ur: "سیلاب سے ہوشیار" },
  warning:  { en: "FLOOD WARNING", ur: "سیلاب کا انتباہ" },
  evacuate: { en: "EVACUATE NOW",  ur: "فوراً گھر خالی کریں" }
};
const BODY_PREPARE = {
  en: "Khabardar! Flood danger is rising in {village}. Be ready to move to {safe} on higher ground. Keep family, papers and medicines ready.",
  ur: "خبردار! {village} میں سیلاب کا خطرہ بڑھ رہا ہے۔ اونچی جگہ {safe} جانے کے لیے تیار رہیں۔ گھر والوں، کاغذات اور دوائیوں کو تیار رکھیں۔"
};
const BODY_GO = {
  en: "Khabardar! Flood is coming to {village}. Go NOW to {safe} on higher ground. Take family, papers and medicines.",
  ur: "خبردار! {village} میں سیلاب آ رہا ہے۔ فوراً اونچی جگہ {safe} پہنچیں۔ گھر والوں، کاغذات اور دوائیوں کو ساتھ لیں۔"
};

function buildTexts(level, v) {
  const body = level === "watch" ? BODY_PREPARE : BODY_GO;
  const out = {};
  for (const lang of LANGS) {
    const vname = lang === "en" ? v.name : v.name_ur || v.name;
    const sname = lang === "en" ? v.safe.name : v.safe.name_ur || v.safe.name;
    out[lang] = { title: TITLES[level][lang], body: body[lang].replace("{village}", vname).replace("{safe}", sname) };
  }
  return out;
}
/* Short SMS text for keypad phones (Roman Urdu reads on every handset). */
function smsText(level, v, test) {
  const head = { watch: "KHABARDAR - Sailab ka khatra", warning: "KHABARDAR - Sailab warning", evacuate: "KHABARDAR - FORAN GHAR KHALI KAREIN" }[level];
  return `${head}: ${v.name}. Oonchi jagah jayein: ${v.safe.name}. Jawab dein 1 = mehfooz, 2 = madad chahiye.${test ? " [DEMO]" : ""}`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function nearestVillage(lat, lon) { return VILLAGES.reduce((a, v) => (haversineKm(v.lat, v.lon, lat, lon) < haversineKm(a.lat, a.lon, lat, lon) ? v : a)); }
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function hashStr(str) { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

// ------------------------------------------------------------------ live data + risk
const TEST_VALUES = { rain_24h: 165, rain_max_1h: 58, rain_72h: 240, river_ratio: 3.4 };
const WX_TTL = 15 * 60; // seconds: keeps us well inside Open-Meteo's free limits

function median(arr) {
  const v = arr.filter((x) => typeof x === "number").sort((a, b) => a - b);
  if (!v.length) return null;
  const n = v.length;
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
}
function pktKeys() {
  const d = new Date(Date.now() + 5 * 3600 * 1000).toISOString(); // Pakistan Standard Time (UTC+5, no DST)
  return { hour: d.slice(0, 13) + ":00", day: d.slice(0, 10) };
}

function summarise(fc, fl) {
  const { hour, day } = pktKeys();
  const s = { rain_24h: null, rain_max_1h: null, rain_72h: null, river_peak_3d: null, river_normal: null, river_ratio: null };
  try {
    const i = Math.max(0, fc.hourly.time.indexOf(hour));
    const nxt = fc.hourly.precipitation.slice(i, i + 24).filter((x) => typeof x === "number");
    s.rain_24h = +nxt.reduce((a, b) => a + b, 0).toFixed(1);
    s.rain_max_1h = nxt.length ? +Math.max(...nxt).toFixed(1) : 0;
    s.rain_72h = +fc.daily.precipitation_sum.filter((x) => typeof x === "number").reduce((a, b) => a + b, 0).toFixed(1);
  } catch (e) { /* no forecast for this place */ }
  try {
    if (fl && fl.daily) {
      const t = fl.daily.time, q = fl.daily.river_discharge;
      let ti = t.indexOf(day); if (ti < 0) ti = Math.max(0, t.length - 7);
      const normal = median(q.slice(0, ti));
      const fut = q.slice(ti, ti + 3).filter((x) => typeof x === "number");
      s.river_peak_3d = fut.length ? +Math.max(...fut).toFixed(1) : null;
      s.river_normal = normal != null ? +normal.toFixed(1) : null;
      if (normal && normal > 0.5 && s.river_peak_3d != null) s.river_ratio = +(s.river_peak_3d / normal).toFixed(2);
    }
  } catch (e) { /* no river data */ }
  return s;
}

/* Risk score 0-100. Inputs: forecast rain (Open-Meteo), observed rain (NASA GPM IMERG), soil wetness (NASA SMAP),
   river rise (GloFAS) and flood water seen by satellite (NASA MODIS flood product). */
function scoreOf(s) {
  const r1h = Math.max(s.rain_max_1h || 0, s.nasa_rain_now || 0);
  const wet = s.nasa_soil == null ? 1 : 1 + clamp((s.nasa_soil - 0.2) / 0.25, 0, 1) * 0.5;
  const rain = (r1h * 6 + (s.rain_24h || 0) * 1.2) * wet;
  const river = s.river_ratio == null ? 0 : Math.max(0, (s.river_ratio - 1) * 60);
  // satellite: a little flood water (1-5 % of the area within 6 km) = Watch; 5 % = Warning; about 13 % or more = Evacuate
  const f = s.nasa_flood_frac || 0;
  const sat = (s.nasa_flood_px || 0) < 3 || f < 0.01 ? 0 : f < 0.05 ? 35 + f * 300 : Math.min(100, 55 + (f - 0.05) * 300);
  const score = Math.round(Math.min(100, Math.max(rain, river, sat)));
  const level = score < 30 ? "normal" : score < 55 ? "watch" : score < 80 ? "warning" : "evacuate";
  const driver = sat > 0 && sat >= rain && sat >= river ? "satellite" : rain >= river ? "rain" : "river";
  return { score, level, driver, wet_factor: +wet.toFixed(2), score_rain: Math.round(rain), score_river: Math.round(river), score_sat: Math.round(sat) };
}

function _wxCacheKey(vs) { return "kh_wx_" + hashStr(vs.map((v) => v.id).join(",")); }
function _readCache(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }

/* Rain forecast + river discharge for a list of places, in one request each. Cached for 15 minutes. */
async function fetchWeather(vs, force) {
  const key = _wxCacheKey(vs), cached = _readCache(key);
  if (!force && cached && Date.now() / 1000 - cached.t < WX_TTL) return cached;
  const lats = vs.map((v) => v.lat).join(","), lons = vs.map((v) => v.lon).join(",");
  const fcUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&hourly=precipitation&daily=precipitation_sum&forecast_days=3&timezone=Asia%2FKarachi`;
  const flUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${lats}&longitude=${lons}&daily=river_discharge&past_days=30&forecast_days=7`;
  try {
    const [r1, r2] = await Promise.all([fetch(fcUrl), fetch(flUrl).catch(() => null)]);
    if (!r1.ok) throw new Error("forecast HTTP " + r1.status);
    let fc = await r1.json();
    if (fc.error) throw new Error(fc.reason || "forecast error");
    let fl = null;
    if (r2 && r2.ok) { fl = await r2.json(); if (fl.error) fl = null; }
    if (!Array.isArray(fc)) fc = [fc];
    if (fl && !Array.isArray(fl)) fl = [fl];
    const base = {};
    vs.forEach((v, i) => (base[v.id] = summarise(fc[i] || {}, fl ? fl[i] : null)));
    const res = { ok: true, t: Date.now() / 1000, base, river_ok: !!fl };
    try { localStorage.setItem(key, JSON.stringify(res)); } catch (e) { /* storage full */ }
    return res;
  } catch (e) {
    if (cached) return Object.assign(cached, { stale: true });
    return { ok: false, t: Date.now() / 1000, base: {}, error: String(e.message || e) };
  }
}

/* Merge weather, NASA and TEST scenarios into one view: {villages: {id: {..., score, level, driver}}} */
function liveView({ wx, nasa, scenario, replay, ids }) {
  const vs = ids ? ids.map((id) => VMAP[id]).filter(Boolean) : VILLAGES;
  const out = { villages: {} };
  for (const v of vs) {
    const s = {};
    if (!replay && wx && wx.base) Object.assign(s, wx.base[v.id] || {});
    if (nasa && nasa[v.id]) Object.assign(s, nasa[v.id]);
    const test = !replay && !!(scenario && scenario[v.id]);
    if (test) Object.assign(s, TEST_VALUES);
    Object.assign(s, scoreOf(s), { test, replay: !!replay });
    out.villages[v.id] = s;
  }
  return out;
}

// ------------------------------------------------------------------ relay + rooms
function relayBase() { return String(CFG.relay || "https://ntfy.sh").replace(/\/$/, ""); }
function topicFor(room) { return "khabardar-" + room; }
function newRoomCode() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = new Uint32Array(14); crypto.getRandomValues(buf);
  return Array.from(buf, (x) => chars[x % chars.length]).join("");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function publish(room, obj) {
  obj.t = obj.t || Date.now() / 1000;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`${relayBase()}/${topicFor(room)}`, { method: "POST", body: JSON.stringify(obj) });
      if (r.ok) return true;
      if (r.status !== 429 && r.status < 500) return false;
    } catch (e) { /* network hiccup: retry */ }
    await sleep(900 * (attempt + 1));
  }
  return false;
}

/* Subscribe to a room. `since` like "12h" first replays recent messages, so a reloaded page rebuilds its state. */
function subscribe(room, since, onMsg, onState) {
  const seen = new Set();
  const url = `${relayBase()}/${topicFor(room)}/sse${since ? "?since=" + encodeURIComponent(since) : ""}`;
  const es = new EventSource(url);
  es.onopen = () => onState && onState("ok");
  es.onerror = () => onState && onState("bad"); // EventSource reconnects by itself
  es.onmessage = (e) => {
    try {
      const d = JSON.parse(e.data);
      if (d.event !== "message" || seen.has(d.id)) return;
      seen.add(d.id);
      const m = JSON.parse(d.message);
      m._time = d.time;
      onMsg(m);
    } catch (err) { /* ignore foreign or malformed messages */ }
  };
  return es;
}

function escHtml(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function fmtTime(t) { return new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
function fmtAgo(sec) { sec = Math.max(0, Math.round(sec)); return sec < 60 ? `${sec}s` : sec < 3600 ? `${Math.floor(sec / 60)} min` : `${Math.floor(sec / 3600)} h ${Math.floor((sec % 3600) / 60)} min`; }
