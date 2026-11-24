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
/* Why a place is at risk, in a form every phone can show in its own language. */
const REASON_TEXT = {
  rain: { en: "Heavy rain expected: {v} mm in 24 hours (up to {h} mm in one hour)", ur: "شدید بارش متوقع: 24 گھنٹوں میں {v} ملی میٹر (ایک گھنٹے میں {h} ملی میٹر تک)" },
  river: { en: "River rising: {v} times its normal flow", ur: "دریا چڑھ رہا ہے: معمول سے {v} گنا بہاؤ" },
  river7: { en: "River expected to rise to {v} times its normal flow by {p}", ur: "دریا {p} تک معمول سے {v} گنا تک چڑھنے کا امکان" },
  satellite: { en: "NASA satellites see flood water nearby ({v}% of the area)", ur: "ناسا سیٹلائٹ کو قریب سیلابی پانی نظر آیا (علاقے کا {v} فیصد)" },
  radar: { en: "NASA radar sees new water nearby ({v}% of the area), even through clouds", ur: "ناسا ریڈار کو قریب نیا پانی نظر آیا (علاقے کا {v} فیصد)، بادلوں کے باوجود" },
  torrent: { en: "Heavy rain in the hills upstream ({p}): {v} mm in 24 hours — hill torrent risk", ur: "اوپر پہاڑوں ({p}) میں شدید بارش: 24 گھنٹوں میں {v} ملی میٹر — رود کوہی کا خطرہ" },
  glof: { en: "Heatwave: up to {v}°C — fast glacier melt and glacial lake outburst risk", ur: "شدید گرمی: {v} ڈگری تک — گلیشیئر تیزی سے پگھلنے اور گلیشیائی جھیل پھٹنے کا خطرہ" },
  storm: { en: "Coastal storm: wind gusts up to {v} km/h — sea surge and heavy rain risk", ur: "ساحلی طوفان: {v} کلومیٹر فی گھنٹہ تک تیز ہوائیں — سمندری لہروں اور شدید بارش کا خطرہ" },
  upstream: { en: "Flood water from {p} expected here in about {v} hours", ur: "{p} سے سیلابی پانی تقریباً {v} گھنٹوں میں یہاں پہنچنے کا امکان" }
};
const DRIVER_NAMES = { rain: "heavy rain", river: "river rise", torrent: "hill torrent", glof: "glacier melt", storm: "coastal storm", satellite: "satellite flood water", upstream: "flood from upstream" };
function reasonOf(d) {
  if (!d || !d.score) return null;
  switch (d.driver) {
    case "satellite": return d.sat_src === "radar" ? { driver: "radar", v: Math.round((d.radar_new_frac || 0) * 100) } : { driver: "satellite", v: Math.round((d.nasa_flood_frac || 0) * 100) };
    case "river": return d.river7_used ? { driver: "river7", v: d.river_peak7_ratio, p: d.river_peak_day_label } : { driver: "river", v: d.river_ratio };
    case "torrent": return { driver: "torrent", v: Math.round(d.up_rain_24h || 0), p: d.up_name };
    case "glof": return { driver: "glof", v: Math.round(d.tmax_3d || 0) };
    case "storm": return { driver: "storm", v: Math.round(d.gust_3d || 0) };
    case "upstream": return { driver: "upstream", v: d.upstream_hours, pid: d.upstream_from };
    default: return { driver: "rain", v: Math.round(d.rain_24h || 0), h: Math.round(Math.max(d.rain_max_1h || 0, d.nasa_rain_now || 0)) };
  }
}
function reasonText(r, lang) {
  if (!r || !REASON_TEXT[r.driver]) return "";
  const p = r.pid && VMAP[r.pid] ? (lang === "en" ? VMAP[r.pid].name : VMAP[r.pid].name_ur) : r.p ?? "";
  return (REASON_TEXT[r.driver][lang] || REASON_TEXT[r.driver].en).replace("{v}", r.v ?? "").replace("{h}", r.h ?? "").replace("{p}", p);
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
  const s = { rain_24h: null, rain_max_1h: null, rain_72h: null, tmax_3d: null, gust_3d: null,
              river_peak_3d: null, river_normal: null, river_ratio: null, river_peak7_ratio: null, river_peak_day: null };
  try {
    const i = Math.max(0, fc.hourly.time.indexOf(hour));
    const nxt = fc.hourly.precipitation.slice(i, i + 24).filter((x) => typeof x === "number");
    s.rain_24h = +nxt.reduce((a, b) => a + b, 0).toFixed(1);
    s.rain_max_1h = nxt.length ? +Math.max(...nxt).toFixed(1) : 0;
    s.rain_72h = +fc.daily.precipitation_sum.filter((x) => typeof x === "number").reduce((a, b) => a + b, 0).toFixed(1);
    const tm = (fc.daily.temperature_2m_max || []).filter((x) => typeof x === "number");
    const gu = (fc.daily.wind_gusts_10m_max || []).filter((x) => typeof x === "number");
    if (tm.length) s.tmax_3d = +Math.max(...tm).toFixed(1);
    if (gu.length) s.gust_3d = Math.round(Math.max(...gu));
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
      // the whole 7-day forecast: when is the river highest?
      let pk = -1, pki = -1;
      for (let k = ti; k < Math.min(q.length, ti + 7); k++) if (typeof q[k] === "number" && q[k] > pk) { pk = q[k]; pki = k; }
      if (normal && normal > 0.5 && pki >= 0) {
        s.river_peak7_ratio = +(pk / normal).toFixed(2);
        s.river_peak_day = t[pki];
        s.river_series = q.slice(Math.max(0, ti - 7), ti + 7).map((x) => (typeof x === "number" ? +(x / normal).toFixed(2) : null));
      }
    }
  } catch (e) { /* no river data */ }
  return s;
}
function dayLabel(iso) { try { return new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); } catch (e) { return iso; } }

const DANGER_KM = { watch: 3, warning: 6, evacuate: 10 };

/* Risk score 0-100 for one place, from every kind of flood that can happen there:
   rain (forecast + NASA IMERG, raised by NASA SMAP wet ground; stronger in mountains and cities), river rise (GloFAS,
   3 and 7 days ahead), hill torrents (rain in the hills upstream), glacier melt (heatwave), coastal storm (wind gusts),
   satellite flood water (NASA MODIS + VIIRS, or new water seen by NASA OPERA radar). Flood from upstream is added in liveView. */
function scoreOf(s, v) {
  const hz = (v && v.hz) || [];
  const r1h = Math.max(s.rain_max_1h || 0, s.nasa_rain_now || 0);
  const wet = s.nasa_soil == null ? 1 : 1 + clamp((s.nasa_soil - 0.2) / 0.25, 0, 1) * 0.5;
  const terrain = hz.includes("urban") ? 1.3 : hz.includes("flash") ? 1.25 : 1;   // fast run-off: steep valleys, paved cities
  const P = {};
  P.rain = (r1h * 6 + (s.rain_24h || 0) * 1.2) * wet * terrain;
  const river3 = s.river_ratio == null ? 0 : Math.max(0, (s.river_ratio - 1) * 60);
  const river7 = s.river_peak7_ratio == null ? 0 : Math.max(0, (s.river_peak7_ratio - 1) * 60 * 0.7);   // further ahead = less certain
  P.river = Math.max(river3, river7);
  P.torrent = hz.includes("torrent") && s.up_rain_24h != null ? (Math.max(s.up_rain_max_1h || 0, 0) * 6 + s.up_rain_24h * 1.2) * 0.9 : 0;
  P.glof = hz.includes("glof") && s.tmax_3d != null ? clamp((s.tmax_3d - v.heat + 2) * 12, 0, 70) : 0;
  P.storm = hz.includes("coastal") && s.gust_3d != null ? clamp((s.gust_3d - 42) * 1.25, 0, 100) : 0;
  // satellite: a little flood water (1-5 % of the area within 6 km) = Watch; 5 % = Warning; about 13 % or more = Evacuate
  const f = s.nasa_flood_frac || 0;
  const satOpt = (s.nasa_flood_px || 0) < 3 || f < 0.01 ? 0 : f < 0.05 ? 35 + f * 300 : Math.min(100, 55 + (f - 0.05) * 300);
  // radar (through clouds): new water compared with 6 weeks earlier; on its own it can only raise Watch (paddy fields also fill)
  const rn = s.radar_new_frac || 0;
  const satRadar = (s.radar_new_px || 0) >= 4 && rn >= 0.03 ? Math.min(54, 35 + rn * 300) : 0;
  P.satellite = Math.max(satOpt, satRadar);
  P.upstream = s.upstream_score || 0;
  let driver = "rain", best = -1;
  for (const [k, val] of Object.entries(P)) if (val > best + 1e-9) { best = val; driver = k; }
  const score = Math.round(Math.min(100, Math.max(0, best)));
  const level = score < 30 ? "normal" : score < 55 ? "watch" : score < 80 ? "warning" : "evacuate";
  return { score, level, driver: score > 0 ? driver : "rain", parts: Object.fromEntries(Object.entries(P).map(([k, x]) => [k, Math.round(x)])),
           wet_factor: +wet.toFixed(2), terrain, sat_src: satRadar > satOpt ? "radar" : "optical", river7_used: river7 > river3 };
}

function _wxCacheKey(vs) { return "kh_wx2_" + hashStr(vs.map((v) => v.id).join(",")); }
function _readCache(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }

/* Rain, temperature and wind forecast (plus rain in the hills above hill-torrent places) and river discharge for a
   list of places, in one request each. Cached for 15 minutes. */
async function fetchWeather(vs, force) {
  const key = _wxCacheKey(vs), cached = _readCache(key);
  if (!force && cached && Date.now() / 1000 - cached.t < WX_TTL) return cached;
  const pts = vs.map((v) => ({ key: v.id, lat: v.lat, lon: v.lon }));
  for (const v of vs) if (v.up) pts.push({ key: "up_" + v.id, lat: v.up[0], lon: v.up[1] });
  const fcUrl = `https://api.open-meteo.com/v1/forecast?latitude=${pts.map((p) => p.lat).join(",")}&longitude=${pts.map((p) => p.lon).join(",")}` +
    `&hourly=precipitation&daily=precipitation_sum,temperature_2m_max,wind_gusts_10m_max&forecast_days=3&timezone=Asia%2FKarachi`;
  const flUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${vs.map((v) => v.lat).join(",")}&longitude=${vs.map((v) => v.lon).join(",")}&daily=river_discharge&past_days=30&forecast_days=7`;
  try {
    const [r1, r2] = await Promise.all([fetch(fcUrl), fetch(flUrl).catch(() => null)]);
    if (!r1.ok) throw new Error("forecast HTTP " + r1.status);
    let fc = await r1.json();
    if (fc.error) throw new Error(fc.reason || "forecast error");
    let fl = null;
    if (r2 && r2.ok) { fl = await r2.json(); if (fl.error) fl = null; }
    if (!Array.isArray(fc)) fc = [fc];
    if (fl && !Array.isArray(fl)) fl = [fl];
    const byKey = {};
    pts.forEach((p, i) => (byKey[p.key] = fc[i] || {}));
    const base = {};
    vs.forEach((v, i) => {
      base[v.id] = summarise(byKey[v.id], fl ? fl[i] : null);
      if (v.up) { const u = summarise(byKey["up_" + v.id], null); Object.assign(base[v.id], { up_rain_24h: u.rain_24h, up_rain_max_1h: u.rain_max_1h }); }
    });
    const res = { ok: true, t: Date.now() / 1000, base, river_ok: !!fl };
    try { localStorage.setItem(key, JSON.stringify(res)); } catch (e) { /* storage full */ }
    return res;
  } catch (e) {
    if (cached) return Object.assign(cached, { stale: true });
    return { ok: false, t: Date.now() / 1000, base: {}, error: String(e.message || e) };
  }
}

/* Which places lie downstream of a place, and roughly how many hours the flood water takes to get there. */
function downstreamOf(id, maxHours = 96) {
  const out = [], seen = new Set([id]), queue = [[id, 0, 0]];
  while (queue.length) {
    const [cur, hrs, hops] = queue.shift();
    for (const [a, b, h, river] of RIVER_LINKS) {
      if (a !== cur || seen.has(b) || hrs + h > maxHours) continue;
      seen.add(b);
      out.push({ id: b, hours: hrs + h, hops: hops + 1, river });
      queue.push([b, hrs + h, hops + 1]);
    }
  }
  return out;
}

/* Merge weather, NASA and TEST scenarios into one view: {villages: {id: {..., score, level, driver}}}.
   Second pass: a place in danger passes part of its danger to the places downstream, with an arrival time. */
function liveView({ wx, nasa, radar, scenario, replay, ids }) {
  const vs = ids ? ids.map((id) => VMAP[id]).filter(Boolean) : VILLAGES;
  const raw = {}, out = { villages: {}, flows: [] };
  for (const v of vs) {
    const s = {};
    if (!replay && wx && wx.base) Object.assign(s, wx.base[v.id] || {});
    if (nasa && nasa[v.id]) Object.assign(s, nasa[v.id]);
    if (radar && radar[v.id]) Object.assign(s, radar[v.id]);
    const test = !replay && !!(scenario && scenario[v.id]);
    if (test) Object.assign(s, TEST_VALUES);
    if (v.up) s.up_name = v.up[2];
    if (s.river_peak_day) s.river_peak_day_label = dayLabel(s.river_peak_day);
    Object.assign(s, { test, replay: !!replay });
    raw[v.id] = s;
  }
  // first pass: each place on its own
  const own = {};
  for (const v of vs) own[v.id] = scoreOf(raw[v.id], v);
  // second pass: flood water travels downstream (coastal storms and city drains do not travel)
  if (!ids) {
    for (const v of vs) {
      const o = own[v.id];
      if (o.score < 55 || o.driver === "storm") continue;
      if (o.driver === "rain" && v.hz.includes("urban") && !v.hz.includes("flash")) continue;
      for (const d of downstreamOf(v.id)) {
        const cap = d.hops === 1 ? [0.8, 79] : d.hops === 2 ? [0.65, 65] : d.hours <= 48 ? [0.5, 54] : null;
        if (!cap) continue;
        const sc = Math.min(o.score * cap[0], cap[1]);
        if (sc < 30) continue;
        const t = raw[d.id];
        if (!t) continue;
        if (!t.upstream_score || sc > t.upstream_score || (sc === t.upstream_score && d.hours < t.upstream_hours)) {
          Object.assign(t, { upstream_score: Math.round(sc), upstream_from: v.id, upstream_hours: d.hours, upstream_river: d.river });
        }
        out.flows.push({ from: v.id, to: d.id, hours: d.hours, hops: d.hops, level: sc >= 55 ? "warning" : "watch", srcLevel: o.level });
      }
    }
  }
  for (const v of vs) {
    const s = raw[v.id];
    Object.assign(s, scoreOf(s, v));
    // people: NASA SEDAC population within 6 km, how many under flood water, how many inside the danger zone
    if (s.pop_density != null) {
      s.pop_6km = Math.round(s.pop_density * Math.PI * 36);
      // only confirmed flood water (MODIS / VIIRS) counts here; radar "new water" can also be a filling barrage pond or paddy fields
      s.people_water = (s.nasa_flood_px || 0) >= 3 && (s.nasa_flood_frac || 0) >= 0.01 ? Math.round(s.pop_6km * s.nasa_flood_frac) : 0;
      s.people_zone = DANGER_KM[s.level] ? Math.round(s.pop_density * Math.PI * DANGER_KM[s.level] ** 2) : 0;
    }
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
