/* Khabardar — phone / PC receiver.
   NOTE: Pashto and Sindhi strings must be checked by native speakers before the pitch. */
const T = {
  en: { tagline: "Flood warning on your phone — in your language, before the water comes.", langLabel: "Language",
    villageLabel: "Your village / town", familyLabel: "Also watch my family's village (optional)", nameLabel: "Your name (optional)",
    gps: "Share my exact location with rescue teams", start: "Turn ON Khabardar",
    soundNote: "Keep this page open and your volume up. Tapping the button allows the siren to play.",
    connecting: "Connecting…", connected: "Connected — alerts ON", offline: "Reconnecting…", protected: "You are protected",
    watching: "Khabardar is watching the rivers and rain for:", riskNow: "Risk now", testSound: "Test siren", change: "Change settings",
    goTo: "Go to", route: "Show route", safe: "I'm safe", help: "I need help", stop: "Stop siren", back: "Back",
    doneSafeTitle: "Thank you — you are marked SAFE", doneSafeText: "The rescue team can see you are safe. Stay on higher ground until the warning ends.",
    doneHelpTitle: "Help is coming", doneHelpText: "Rescue teams can see your request. Stay where you are, keep your phone on, and move higher if water rises.",
    levels: { normal: "Normal", watch: "Watch", warning: "Warning", evacuate: "Evacuate" }, rain: "Rain next 24h", river: "River vs normal" },
  ur: { tagline: "سیلاب کی وارننگ آپ کے فون پر — آپ کی زبان میں، پانی آنے سے پہلے۔", langLabel: "زبان",
    villageLabel: "آپ کا گاؤں / شہر", familyLabel: "گھر والوں کا گاؤں بھی دیکھیں (اختیاری)", nameLabel: "آپ کا نام (اختیاری)",
    gps: "میری درست جگہ امدادی ٹیموں کو بتائیں", start: "خبردار آن کریں",
    soundNote: "یہ صفحہ کھلا رکھیں اور آواز اونچی رکھیں۔ بٹن دبانے سے سائرن بج سکے گا۔",
    connecting: "رابطہ ہو رہا ہے…", connected: "رابطہ ہو گیا — الرٹ آن ہیں", offline: "دوبارہ رابطہ…", protected: "آپ محفوظ نگرانی میں ہیں",
    watching: "خبردار ان جگہوں کے دریا اور بارش پر نظر رکھے ہوئے ہے:", riskNow: "موجودہ خطرہ", testSound: "سائرن آزمائیں", change: "ترتیبات بدلیں",
    goTo: "یہاں جائیں", route: "راستہ دکھائیں", safe: "میں محفوظ ہوں", help: "مجھے مدد چاہیے", stop: "سائرن بند کریں", back: "واپس",
    doneSafeTitle: "شکریہ — آپ محفوظ درج ہو گئے", doneSafeText: "امدادی ٹیم دیکھ سکتی ہے کہ آپ محفوظ ہیں۔ وارننگ ختم ہونے تک اونچی جگہ پر رہیں۔",
    doneHelpTitle: "مدد آ رہی ہے", doneHelpText: "امدادی ٹیمیں آپ کی درخواست دیکھ رہی ہیں۔ وہیں رہیں، فون آن رکھیں، اور پانی بڑھے تو اونچی جگہ جائیں۔",
    levels: { normal: "معمول", watch: "ہوشیار", warning: "انتباہ", evacuate: "انخلا" }, rain: "اگلے 24 گھنٹے بارش", river: "دریا معمول سے" },
  ps: { tagline: "د سېلاب خبرداری ستاسو په ټیلیفون — ستاسو په ژبه، د اوبو له راتګ مخکې.", langLabel: "ژبه",
    villageLabel: "ستاسو کلی / ښار", familyLabel: "د کورنۍ کلی هم وګورئ (اختیاري)", nameLabel: "ستاسو نوم (اختیاري)",
    gps: "زما دقیق ځای د ژغورنې ټیمونو ته وښایئ", start: "خبردار چالان کړئ",
    soundNote: "دا پاڼه خلاصه وساتئ او غږ لوړ کړئ. د تڼۍ په کېکاږلو سره سایرن غږېدای شي.",
    connecting: "اړیکه نیول کیږي…", connected: "اړیکه ټینګه شوه — خبرتیاوې چالانې دي", offline: "بیا اړیکه…", protected: "تاسو خوندي یاست",
    watching: "خبردار د دې ځایونو سیندونو او باران ته ګوري:", riskNow: "اوسنی خطر", testSound: "سایرن وازمویئ", change: "تنظیمات بدل کړئ",
    goTo: "دې ځای ته لاړ شئ", route: "لاره وښایئ", safe: "زه خوندي یم", help: "مرستې ته اړتیا لرم", stop: "سایرن بند کړئ", back: "شاته",
    doneSafeTitle: "مننه — تاسو خوندي ثبت شوئ", doneSafeText: "د ژغورنې ټیم ویني چې تاسو خوندي یاست. تر هغې په لوړ ځای کې پاتې شئ چې خبرداری پای ته ورسیږي.",
    doneHelpTitle: "مرسته راروانه ده", doneHelpText: "د ژغورنې ټیمونه ستاسو غوښتنه ویني. همالته پاتې شئ، ټیلیفون چالان وساتئ، او که اوبه پورته شي لوړ ځای ته لاړ شئ.",
    levels: { normal: "عادي", watch: "پام", warning: "خبرداری", evacuate: "وتل" }, rain: "راتلونکي 24 ساعته باران", river: "سیند د عادي په پرتله" },
  sd: { tagline: "ٻوڏ جي خبرداري توهان جي فون تي — توهان جي ٻولي ۾، پاڻي اچڻ کان اڳ.", langLabel: "ٻولي",
    villageLabel: "توهان جو ڳوٺ / شهر", familyLabel: "گهر ڀاتين جو ڳوٺ پڻ ڏسو (اختياري)", nameLabel: "توهان جو نالو (اختياري)",
    gps: "منهنجي صحيح جاءِ بچاءُ ٽيمن کي ٻڌايو", start: "خبردار آن ڪريو",
    soundNote: "هي صفحو کليل رکو ۽ آواز وڌايو. بٽڻ دٻائڻ سان سائرن وڄي سگهندو.",
    connecting: "رابطو ٿي رهيو آهي…", connected: "رابطو ٿي ويو — الرٽ آن آهن", offline: "ٻيهر رابطو…", protected: "توهان محفوظ نگراني ۾ آهيو",
    watching: "خبردار هنن جاين جي دريائن ۽ برسات تي نظر رکي ٿو:", riskNow: "هاڻوڪو خطرو", testSound: "سائرن آزمايو", change: "سيٽنگون بدلايو",
    goTo: "هتي وڃو", route: "رستو ڏيکاريو", safe: "مان محفوظ آهيان", help: "مون کي مدد گهرجي", stop: "سائرن بند ڪريو", back: "واپس",
    doneSafeTitle: "مهرباني — توهان محفوظ درج ٿي ويا", doneSafeText: "بچاءُ ٽيم ڏسي سگهي ٿي ته توهان محفوظ آهيو. خبرداري ختم ٿيڻ تائين مٿانهين جاءِ تي رهو.",
    doneHelpTitle: "مدد اچي رهي آهي", doneHelpText: "بچاءُ ٽيمون توهان جي درخواست ڏسي رهيون آهن. اتي ئي رهو، فون آن رکو، ۽ پاڻي وڌي ته مٿانهين جاءِ تي وڃو.",
    levels: { normal: "معمول", watch: "هوشيار", warning: "خبرداري", evacuate: "نڪرڻ" }, rain: "ايندڙ 24 ڪلاڪ برسات", river: "درياهه معمول کان" }
};
const RTL = { ur: true, ps: true, sd: true, en: false };
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let settings = JSON.parse(localStorage.getItem("khabardar") || "{}");
if (!settings.id) settings.id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, "").slice(0, 16);
let lang = settings.lang || "ur";
let villages = [], vmap = {};
let es = null, current = null, answered = new Set(JSON.parse(localStorage.getItem("khabardar_answered") || "[]"));
let alertActive = false, sirenMuted = false, cycleTimer = null, wakeLock = null, coords = null;

function save() { settings.lang = lang; localStorage.setItem("khabardar", JSON.stringify(settings)); }
function t(k) { return (T[lang] && T[lang][k]) || T.en[k] || k; }
function show(id) { ["setup", "idle", "alert", "done"].forEach((s) => ($(s).hidden = s !== id)); }

function applyLang() {
  document.documentElement.lang = lang;
  document.body.dir = RTL[lang] ? "rtl" : "ltr";
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  document.querySelectorAll("#langs button").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
  fillVillageSelects();
}

function vLabel(v) { return RTL[lang] ? `${v.name_ur || v.name} — ${v.name}` : `${v.name} (${v.district})`; }

function fillVillageSelects() {
  const groups = {};
  villages.forEach((v) => (groups[v.district] = groups[v.district] || []).push(v));
  const opts = Object.entries(groups).map(([d, vs]) => `<optgroup label="${d}">${vs.map((v) => `<option value="${v.id}">${vLabel(v)}</option>`).join("")}</optgroup>`).join("");
  const sel = $("village").value || settings.village || "mingora";
  const fam = $("family").value || settings.family || "";
  $("village").innerHTML = opts;
  $("family").innerHTML = `<option value="">—</option>` + opts;
  $("village").value = sel; $("family").value = fam;
}

// ------------------------------------------------------------- sound: siren + voice
let ctx = null, sirenTimer = null;
function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
    const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination); s.start(0);
  } catch (e) { /* audio not available */ }
  if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); }
}
function sirenOnce() {
  if (!ctx) return;
  const t0 = ctx.currentTime, osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(650, t0);
  osc.frequency.linearRampToValueAtTime(1450, t0 + 0.9);
  osc.frequency.linearRampToValueAtTime(650, t0 + 1.8);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.55, t0 + 0.05);
  g.gain.setValueAtTime(0.55, t0 + 1.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + 1.85);
}
function startSiren() { stopSiren(); if (ctx && ctx.state === "suspended") ctx.resume(); sirenOnce(); sirenTimer = setInterval(sirenOnce, 1850); }
function stopSiren() { clearInterval(sirenTimer); sirenTimer = null; }

function playFile(url) {
  return new Promise((resolve, reject) => {
    const a = new Audio(url);
    a.onended = () => resolve(true);
    a.onerror = () => reject(new Error("no file"));
    a.play().catch(reject);
  });
}
function speakTTS(text, code) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve(false);
    const voices = speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang && x.lang.toLowerCase().startsWith(code));
    if (!v) return resolve(false);
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v; u.lang = v.lang; u.rate = 0.95; u.volume = 1;
    const done = () => resolve(true);
    u.onend = done; u.onerror = done;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
    setTimeout(done, 20000);
  });
}
async function speakAlert(a) {
  const tx = a.texts;
  // 1) a pre-recorded voice file by the team (best quality, works for Pashto & Sindhi)
  try { await playFile(`/static/audio/${lang}_${a.level}.mp3`); return; } catch (e) { /* fall through */ }
  // 2) the phone's own text-to-speech in the chosen language, then Urdu, then English
  const order = lang === "en" ? [["en", "en"]] : [[lang, lang], ["ur", "ur"], ["en", "en"]];
  for (const [code, key] of order) {
    if (await speakTTS(`${tx[key].title}. ${tx[key].body}`, code)) return;
  }
}

async function alertCycle() {
  if (!alertActive || sirenMuted) return;
  startSiren();
  if (navigator.vibrate) navigator.vibrate([900, 300, 900, 300, 900, 300, 900]);
  await sleep(5600);
  stopSiren();
  if (!alertActive || sirenMuted) return;
  await speakAlert(current);
  if (!alertActive || sirenMuted) return;
  cycleTimer = setTimeout(alertCycle, 4000);
}
function endAlertSound() {
  alertActive = false; stopSiren(); clearTimeout(cycleTimer);
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (navigator.vibrate) navigator.vibrate(0);
}

// ------------------------------------------------------------- server links
async function post(path, body) {
  try { const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return await r.json(); }
  catch (e) { return { ok: false }; }
}

function connect() {
  if (es) es.close();
  es = new EventSource(`/events/phone?id=${encodeURIComponent(settings.id)}`);
  setConn("connecting");
  es.onopen = () => setConn("ok");
  es.onerror = () => setConn("bad");
  es.addEventListener("hello", () => setConn("ok"));
  es.addEventListener("alert", (e) => onAlert(JSON.parse(e.data)));
  es.addEventListener("reset", () => {
    answered.clear(); localStorage.setItem("khabardar_answered", "[]");
    if (alertActive || !$("done").hidden) { endAlertSound(); current = null; show("idle"); }
  });
}
function setConn(state) {
  const c = $("conn"); c.className = "conn " + (state === "ok" ? "ok" : state === "bad" ? "bad" : "");
  $("connText").textContent = state === "ok" ? t("connected") : state === "bad" ? t("offline") : t("connecting");
}

function onAlert(a) {
  if (answered.has(a.alert_id)) return;
  if (current && current.alert_id === a.alert_id && alertActive) return;
  current = a;
  post("/api/ack", { id: settings.id, alert_id: a.alert_id, stage: "delivered" });
  const tx = a.texts[lang] || a.texts.en;
  const sec = $("alert");
  sec.className = "screen alert " + a.level;
  $("demoTag").hidden = !a.test;
  $("aTitle").textContent = tx.title;
  $("aPlace").textContent = RTL[lang] ? (a.village.name_ur || a.village.name) : a.village.name;
  $("aBody").textContent = tx.body;
  $("aSafe").textContent = RTL[lang] ? (a.safe.name_ur || a.safe.name) : a.safe.name;
  $("routeBtn").href = `https://www.google.com/maps/dir/?api=1&destination=${a.safe.lat},${a.safe.lon}&travelmode=walking`;
  show("alert");
  if (document.hidden && "Notification" in window && Notification.permission === "granted") {
    try { new Notification("⚠ " + tx.title, { body: tx.body, requireInteraction: true }); } catch (e) {}
  }
  alertActive = true; sirenMuted = false;
  alertCycle();
  post("/api/ack", { id: settings.id, alert_id: a.alert_id, stage: "played" });
}

async function respond(status) {
  if (!current) return;
  endAlertSound();
  const body = { id: settings.id, alert_id: current.alert_id, status };
  if (coords) { body.lat = coords.lat; body.lon = coords.lon; }
  await post("/api/respond", body);
  answered.add(current.alert_id);
  localStorage.setItem("khabardar_answered", JSON.stringify([...answered]));
  $("doneIcon").textContent = status === "safe" ? "✓" : "!";
  $("doneIcon").style.background = status === "safe" ? "var(--green)" : "var(--red)";
  $("doneTitle").textContent = t(status === "safe" ? "doneSafeTitle" : "doneHelpTitle");
  $("doneText").textContent = t(status === "safe" ? "doneSafeText" : "doneHelpText");
  show("done");
}

// ------------------------------------------------------------- idle screen: live risk for my village
async function refreshRisk() {
  try {
    const live = await (await fetch("/api/live")).json();
    const id = settings.village, d = live.villages[id];
    if (!d) return;
    $("riskNow").textContent = `${t("levels")[d.level] || d.level} (${d.score})`;
    $("riskDetail").textContent = `${t("rain")}: ${d.rain_24h ?? "–"} mm · ${t("river")}: ${d.river_ratio != null ? d.river_ratio + "×" : "n/a"}`;
  } catch (e) { /* offline */ }
}
function renderIdle() {
  const ids = [settings.village, settings.family].filter(Boolean);
  $("idleVillages").textContent = ids.map((id) => (RTL[lang] ? vmap[id].name_ur || vmap[id].name : vmap[id].name)).join(" · ");
  refreshRisk();
}

async function requestWakeLock() {
  try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {}
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) { requestWakeLock(); if (ctx) ctx.resume(); } });

// ------------------------------------------------------------- setup flow
$("langs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; lang = b.dataset.lang; save(); applyLang(); });

$("startBtn").addEventListener("click", async () => {
  unlockAudio();
  settings.village = $("village").value;
  settings.family = $("family").value && $("family").value !== settings.village ? $("family").value : "";
  settings.name = $("name").value.trim();
  settings.gps = $("useGps").checked;
  save();
  if ("Notification" in window && window.isSecureContext && Notification.permission === "default") { try { Notification.requestPermission(); } catch (e) {} }
  requestWakeLock();
  coords = null;
  if (settings.gps && navigator.geolocation && window.isSecureContext) {
    coords = await new Promise((res) => navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }), () => res(null), { timeout: 8000, enableHighAccuracy: true }));
  }
  const r = await post("/api/join", { id: settings.id, name: settings.name, villages: [settings.village, settings.family].filter(Boolean),
    lang, lat: coords?.lat ?? null, lon: coords?.lon ?? null, device: navigator.userAgent.slice(0, 60) });
  if (r && r.id) settings.id = r.id;
  save();
  renderIdle(); show("idle"); connect();
});

$("testSound").addEventListener("click", async () => { unlockAudio(); startSiren(); await sleep(3700); stopSiren(); });
$("changeBtn").addEventListener("click", () => show("setup"));
$("safeBtn").addEventListener("click", () => respond("safe"));
$("helpBtn").addEventListener("click", () => respond("help"));
$("stopBtn").addEventListener("click", () => { sirenMuted = true; stopSiren(); clearTimeout(cycleTimer); if ("speechSynthesis" in window) speechSynthesis.cancel(); });
$("backBtn").addEventListener("click", () => { show("idle"); renderIdle(); });
setInterval(() => { if (!$("idle").hidden) refreshRisk(); }, 60000);
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

(async function init() {
  const vs = await (await fetch("/api/villages")).json();
  villages = vs.villages; villages.forEach((v) => (vmap[v.id] = v));
  $("name").value = settings.name || "";
  if (window.isSecureContext && navigator.geolocation) { $("gpsWrap").hidden = false; $("useGps").checked = !!settings.gps; }
  applyLang();
  show("setup");
})();
