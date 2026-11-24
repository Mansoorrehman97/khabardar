/* Khabardar static edition — shared logic (runs entirely in the browser).
   Live data: Open-Meteo forecast + GloFAS (Open-Meteo Flood API), fetched directly by the browser.
   Real-time link between control room and phones: the free public ntfy.sh relay, on a random "room" topic.
   NOTE: Pashto and Sindhi texts must be checked by native speakers before the pitch. */

const RELAY = "https://ntfy.sh";

const VILLAGES = [
  { id: "mingora", name: "Mingora", name_ur: "مینگورہ", district: "Swat", lat: 34.7717, lon: 72.36, safe: { name: "Govt. High School", name_ur: "سرکاری ہائی اسکول", lat: 34.784, lon: 72.374 } },
  { id: "bahrain", name: "Bahrain", name_ur: "بحرین", district: "Swat", lat: 35.2072, lon: 72.5464, safe: { name: "Hillside Mosque Ground", name_ur: "پہاڑی مسجد کا میدان", lat: 35.215, lon: 72.556 } },
  { id: "madyan", name: "Madyan", name_ur: "مدین", district: "Swat", lat: 35.1386, lon: 72.5361, safe: { name: "Upper Bazaar Ground", name_ur: "اوپر بازار کا میدان", lat: 35.146, lon: 72.545 } },
  { id: "kalam", name: "Kalam", name_ur: "کالام", district: "Swat", lat: 35.4875, lon: 72.5847, safe: { name: "Govt. College", name_ur: "سرکاری کالج", lat: 35.495, lon: 72.593 } },
  { id: "daggar", name: "Daggar", name_ur: "ڈگر", district: "Buner", lat: 34.504, lon: 72.484, safe: { name: "District HQ Hospital Ground", name_ur: "ضلعی ہسپتال کا میدان", lat: 34.512, lon: 72.495 } },
  { id: "pirbaba", name: "Pir Baba", name_ur: "پیر بابا", district: "Buner", lat: 34.48, lon: 72.45, safe: { name: "Hilltop School", name_ur: "پہاڑی اسکول", lat: 34.488, lon: 72.461 } },
  { id: "alpuri", name: "Alpuri", name_ur: "الپوری", district: "Shangla", lat: 34.9033, lon: 72.6417, safe: { name: "Govt. Degree College", name_ur: "سرکاری ڈگری کالج", lat: 34.91, lon: 72.652 } },
  { id: "nowshera", name: "Nowshera", name_ur: "نوشہرہ", district: "Nowshera", lat: 34.0153, lon: 71.9747, safe: { name: "Cantonment Ground", name_ur: "کینٹ کا میدان", lat: 34.029, lon: 71.99 } },
  { id: "marala", name: "Marala (Chenab)", name_ur: "مرالہ (چناب)", district: "Sialkot", lat: 32.673, lon: 74.464, safe: { name: "Raised Canal Colony", name_ur: "نہری کالونی", lat: 32.685, lon: 74.48 } },
  { id: "wazirabad", name: "Wazirabad", name_ur: "وزیرآباد", district: "Gujranwala", lat: 32.443, lon: 74.12, safe: { name: "Govt. Boys School", name_ur: "سرکاری بوائز اسکول", lat: 32.454, lon: 74.133 } },
  { id: "sukkur", name: "Sukkur", name_ur: "سکھر", district: "Sukkur", lat: 27.7052, lon: 68.8574, safe: { name: "Raised Relief Camp Site", name_ur: "امدادی کیمپ", lat: 27.717, lon: 68.87 } },
  { id: "dadu", name: "Dadu", name_ur: "دادو", district: "Dadu", lat: 26.7319, lon: 67.775, safe: { name: "Embankment Relief Point", name_ur: "پشتے پر امدادی مقام", lat: 26.743, lon: 67.789 } }
];
const VMAP = Object.fromEntries(VILLAGES.map((v) => [v.id, v]));

const TITLES = {
  watch:    { en: "FLOOD WATCH",   ur: "سیلاب سے ہوشیار",     ps: "د سېلاب پام",       sd: "ٻوڏ کان هوشيار" },
  warning:  { en: "FLOOD WARNING", ur: "سیلاب کا انتباہ",     ps: "د سېلاب خبرداری",   sd: "ٻوڏ جي خبرداري" },
  evacuate: { en: "EVACUATE NOW",  ur: "فوراً گھر خالی کریں", ps: "سمدستي کور پرېږدئ", sd: "فوري گهر خالي ڪريو" }
};
const BODY_PREPARE = {
  en: "Khabardar! Flood danger is rising in {village}. Be ready to move to {safe} on higher ground. Keep family, papers and medicines ready.",
  ur: "خبردار! {village} میں سیلاب کا خطرہ بڑھ رہا ہے۔ اونچی جگہ {safe} جانے کے لیے تیار رہیں۔ گھر والوں، کاغذات اور دوائیوں کو تیار رکھیں۔",
  ps: "خبردار! په {village} کې د سېلاب خطر زیاتېږي. لوړ ځای {safe} ته د تلو لپاره تیار اوسئ. کورنۍ، کاغذونه او درمل تیار وساتئ.",
  sd: "خبردار! {village} ۾ ٻوڏ جو خطرو وڌي رهيو آهي. مٿانهين جاءِ {safe} ڏانهن وڃڻ لاءِ تيار رهو. گهر ڀاتين، ڪاغذن ۽ دوائن کي تيار رکو."
};
const BODY_GO = {
  en: "Khabardar! Flood is coming to {village}. Go NOW to {safe} on higher ground. Take family, papers and medicines.",
  ur: "خبردار! {village} میں سیلاب آ رہا ہے۔ فوراً اونچی جگہ {safe} پہنچیں۔ گھر والوں، کاغذات اور دوائیوں کو ساتھ لیں۔",
  ps: "خبردار! په {village} کې د سېلاب خطر دی. ژر تر ژره لوړ ځای {safe} ته لاړ شئ. کورنۍ، کاغذونه او درمل له ځانه سره واخلئ.",
  sd: "خبردار! {village} ۾ ٻوڏ جو خطرو آهي. جلدي مٿانهين جاءِ {safe} تي پهچو. گهر ڀاتين، ڪاغذن ۽ دوائن کي ساڻ کڻو."
};

function buildTexts(level, v) {
  const body = level === "watch" ? BODY_PREPARE : BODY_GO;
  const out = {};
  for (const lang of ["en", "ur", "ps", "sd"]) {
    const vname = lang === "en" ? v.name : v.name_ur || v.name;
    const sname = lang === "en" ? v.safe.name : v.safe.name_ur || v.safe.name;
    out[lang] = { title: TITLES[level][lang], body: body[lang].replace("{village}", vname).replace("{safe}", sname) };
  }
  return out;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ------------------------------------------------------------------ live data + risk
const TEST_VALUES = { rain_24h: 165, rain_max_1h: 58, rain_72h: 240, river_ratio: 3.4 };

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
  } catch (e) { /* no forecast */ }
  try {
    if (fl) {
      const t = fl.daily.time, q = fl.daily.river_discharge;
      let ti = t.indexOf(day); if (ti < 0) ti = Math.max(0, t.length - 7);
      const normal = median(q.slice(0, ti));
      const fut = q.slice(ti, ti + 3).filter((x) => typeof x === "number");
      s.river_peak_3d = fut.length ? Math.max(...fut) : null;
      s.river_normal = normal != null ? +normal.toFixed(1) : null;
      if (normal && s.river_peak_3d != null) s.river_ratio = +(s.river_peak_3d / normal).toFixed(2);
    }
  } catch (e) { /* no river data */ }
  return s;
}

function scoreOf(s) {
  const rain = (s.rain_max_1h || 0) * 6 + (s.rain_24h || 0) * 1.2;
  const river = s.river_ratio == null ? 0 : Math.max(0, (s.river_ratio - 1) * 60);
  const score = Math.round(Math.min(100, Math.max(rain, river)));
  const level = score < 30 ? "normal" : score < 55 ? "watch" : score < 80 ? "warning" : "evacuate";
  return { score, level, driver: rain >= river ? "rain" : "river" };
}

let _liveCache = null;
async function fetchLive(force) {
  if (!force && _liveCache && Date.now() - _liveCache.fetched_at * 1000 < 10 * 60 * 1000) return _liveCache;
  const lats = VILLAGES.map((v) => v.lat).join(","), lons = VILLAGES.map((v) => v.lon).join(",");
  const fcUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&hourly=precipitation&daily=precipitation_sum&forecast_days=3&timezone=Asia%2FKarachi`;
  const flUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${lats}&longitude=${lons}&daily=river_discharge&past_days=30&forecast_days=7`;
  try {
    let fc = await (await fetch(fcUrl)).json();
    let fl = null;
    try { fl = await (await fetch(flUrl)).json(); } catch (e) { /* river data optional */ }
    if (!Array.isArray(fc)) fc = [fc];
    if (fl && !Array.isArray(fl)) fl = [fl];
    const base = {};
    VILLAGES.forEach((v, i) => (base[v.id] = summarise(fc[i] || {}, fl ? fl[i] : null)));
    _liveCache = { source: "live", fetched_at: Date.now() / 1000, base };
  } catch (e) {
    if (!_liveCache) _liveCache = { source: "offline — live values unavailable", fetched_at: Date.now() / 1000, base: {} };
  }
  return _liveCache;
}

function liveView(cache, scenario) {
  const out = { source: cache.source, fetched_at: cache.fetched_at, villages: {} };
  for (const v of VILLAGES) {
    const s = Object.assign({}, cache.base[v.id] || {});
    const test = !!(scenario && scenario[v.id]);
    if (test) Object.assign(s, TEST_VALUES);
    Object.assign(s, scoreOf(s), { test });
    out.villages[v.id] = s;
  }
  return out;
}

// ------------------------------------------------------------------ relay (ntfy.sh) + rooms
function topicFor(room) { return "khabardar-" + room; }

function newRoomCode() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = new Uint32Array(14); crypto.getRandomValues(buf);
  return Array.from(buf, (x) => chars[x % chars.length]).join("");
}

async function publish(room, obj) {
  obj.t = obj.t || Date.now() / 1000;
  try {
    const r = await fetch(`${RELAY}/${topicFor(room)}`, { method: "POST", body: JSON.stringify(obj) });
    return r.ok;
  } catch (e) { return false; }
}

/* Subscribe to a room. `since` like "1h" replays recent messages first (ntfy keeps them for a while). */
function subscribe(room, since, onMsg, onState) {
  const seen = new Set();
  const url = `${RELAY}/${topicFor(room)}/sse${since ? "?since=" + encodeURIComponent(since) : ""}`;
  const es = new EventSource(url);
  es.onopen = () => onState && onState("ok");
  es.onerror = () => onState && onState("bad");
  es.onmessage = (e) => {
    try {
      const d = JSON.parse(e.data);
      if (d.event !== "message" || seen.has(d.id)) return;
      seen.add(d.id);
      const m = JSON.parse(d.message);
      m._time = d.time;
      onMsg(m);
    } catch (err) { /* ignore foreign messages */ }
  };
  return es;
}

function escHtml(s) { return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function fmtTime(t) { return new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
