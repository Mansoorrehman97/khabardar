/* Khabardar — phone / PC receiver. Talks to the control room through the room's relay topic.
   Languages: Urdu and English. */
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
    levels: { normal: "Normal", watch: "Watch", warning: "Warning", evacuate: "Evacuate" }, rain: "Rain next 24h", river: "River vs normal",
    detailsTitle: "Tell the rescue team more (optional)", peopleQ: "How many people are with you?", needsQ: "Does anyone need special care?",
    injured: "Injured", elderly: "Elderly / disabled", children: "Children", pregnant: "Pregnant woman", water: "Water is rising here",
    sendDetails: "Send details", detailsSent: "Details sent ✓", teamComing: "Rescue team {team} is on the way — about {eta} minutes.",
    rescued: "The control room has marked you as rescued. Stay safe.", gpsShared: "Your location was shared with the rescue team.",
    gpsNot: "Location not shared — rescuers will search your village area.", away: "{km} km away",
    nasaClear: "NASA satellite: no flood water seen near you", nasaFlood: "NASA satellite: flood water seen near you", nasaCloud: "NASA satellite: cloudy, no clear view",
    sending: "Sending…", sentOk: "Your answer reached the control room.", sendFail: "Could not send — check your internet and tap Try again.", retry: "Try again",
    why: "WHY", autoWhy: "AUTOMATIC WARNING — WHY",
    reportOpen: "Report people who need help", reportTitle: "Report people who need help",
    reportIntro: "For neighbours or anyone without Khabardar. The control room will send a rescue team.",
    reportWhere: "Where are they?", reportHere: "They are near me (use my location)", reportPeople: "How many people?",
    reportNote: "Landmark or names (optional)", reportSend: "Send report", reportOk: "Report sent — the control room can see it. Thank you.",
    savedOffline: "No connection — saved on this phone. It will be sent automatically when the signal returns.",
    outboxWaiting: "{n} message(s) waiting for the signal — they will be sent automatically." },
  ur: { tagline: "سیلاب کی وارننگ آپ کے فون پر — آپ کی زبان میں، پانی آنے سے پہلے۔", langLabel: "زبان",
    villageLabel: "آپ کا گاؤں / شہر", familyLabel: "گھر والوں کا گاؤں بھی دیکھیں (اختیاری)", nameLabel: "آپ کا نام (اختیاری)",
    gps: "میری درست جگہ امدادی ٹیموں کو بتائیں", start: "خبردار آن کریں",
    soundNote: "یہ صفحہ کھلا رکھیں اور آواز اونچی رکھیں۔ بٹن دبانے سے سائرن بج سکے گا۔",
    connecting: "رابطہ ہو رہا ہے…", connected: "رابطہ ہو گیا — الرٹ آن ہیں", offline: "دوبارہ رابطہ…", protected: "آپ محفوظ نگرانی میں ہیں",
    watching: "خبردار ان جگہوں کے دریا اور بارش پر نظر رکھے ہوئے ہے:", riskNow: "موجودہ خطرہ", testSound: "سائرن آزمائیں", change: "ترتیبات بدلیں",
    goTo: "یہاں جائیں", route: "راستہ دکھائیں", safe: "میں محفوظ ہوں", help: "مجھے مدد چاہیے", stop: "سائرن بند کریں", back: "واپس",
    doneSafeTitle: "شکریہ — آپ محفوظ درج ہو گئے", doneSafeText: "امدادی ٹیم دیکھ سکتی ہے کہ آپ محفوظ ہیں۔ وارننگ ختم ہونے تک اونچی جگہ پر رہیں۔",
    doneHelpTitle: "مدد آ رہی ہے", doneHelpText: "امدادی ٹیمیں آپ کی درخواست دیکھ رہی ہیں۔ وہیں رہیں، فون آن رکھیں، اور پانی بڑھے تو اونچی جگہ جائیں۔",
    levels: { normal: "معمول", watch: "ہوشیار", warning: "انتباہ", evacuate: "انخلا" }, rain: "اگلے 24 گھنٹے بارش", river: "دریا معمول سے",
    detailsTitle: "امدادی ٹیم کو مزید بتائیں (اختیاری)", peopleQ: "آپ کے ساتھ کتنے لوگ ہیں؟", needsQ: "کیا کسی کو خاص مدد کی ضرورت ہے؟",
    injured: "زخمی", elderly: "بزرگ / معذور", children: "بچے", pregnant: "حاملہ خاتون", water: "یہاں پانی بڑھ رہا ہے",
    sendDetails: "تفصیل بھیجیں", detailsSent: "تفصیل بھیج دی گئی ✓", teamComing: "امدادی ٹیم {team} آپ کی طرف آ رہی ہے — تقریباً {eta} منٹ۔",
    rescued: "کنٹرول روم نے آپ کو بچا لیا گیا درج کر دیا ہے۔ محفوظ رہیں۔", gpsShared: "آپ کی جگہ امدادی ٹیم کو بتا دی گئی۔",
    gpsNot: "جگہ نہیں بتائی گئی — امدادی ٹیم آپ کے گاؤں کے علاقے میں تلاش کرے گی۔", away: "{km} کلومیٹر دور",
    nasaClear: "ناسا سیٹلائٹ: آپ کے قریب سیلابی پانی نظر نہیں آیا", nasaFlood: "ناسا سیٹلائٹ: آپ کے قریب سیلابی پانی نظر آیا", nasaCloud: "ناسا سیٹلائٹ: بادل ہیں، صاف منظر نہیں",
    sending: "بھیجا جا رہا ہے…", sentOk: "آپ کا جواب کنٹرول روم تک پہنچ گیا۔", sendFail: "نہیں بھیجا جا سکا — انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔", retry: "دوبارہ کوشش کریں",
    why: "وجہ", autoWhy: "خودکار وارننگ — وجہ",
    reportOpen: "مدد کے محتاج لوگوں کی اطلاع دیں", reportTitle: "مدد کے محتاج لوگوں کی اطلاع دیں",
    reportIntro: "پڑوسیوں یا ان لوگوں کے لیے جن کے پاس خبردار نہیں۔ کنٹرول روم امدادی ٹیم بھیجے گا۔",
    reportWhere: "وہ کہاں ہیں؟", reportHere: "وہ میرے قریب ہیں (میری جگہ استعمال کریں)", reportPeople: "کتنے لوگ ہیں؟",
    reportNote: "نشانی یا نام (اختیاری)", reportSend: "اطلاع بھیجیں", reportOk: "اطلاع بھیج دی گئی — کنٹرول روم اسے دیکھ سکتا ہے۔ شکریہ۔",
    savedOffline: "رابطہ نہیں — پیغام اس فون میں محفوظ ہے۔ سگنل آتے ہی خود بخود بھیج دیا جائے گا۔",
    outboxWaiting: "{n} پیغام سگنل کے انتظار میں ہیں — خود بخود بھیج دیے جائیں گے۔" },
};
const RTL = { ur: true, en: false };
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

let settings = JSON.parse(localStorage.getItem("khabardar") || "{}");
if (!settings.id) settings.id = Array.from(crypto.getRandomValues(new Uint32Array(3)), (x) => x.toString(36)).join("").slice(0, 16);
if (params.get("room")) settings.room = params.get("room").toLowerCase().replace(/[^a-z0-9]/g, "");
if (params.get("v") && VMAP[params.get("v")] && !settings.village) settings.village = params.get("v");
if (params.get("name") && !settings.name) settings.name = params.get("name").slice(0, 40);
let lang = T[params.get("lang")] ? params.get("lang") : T[settings.lang] ? settings.lang : "ur"; // older saved choices fall back to Urdu
let es = null, current = null, scenario = {}, lastReset = 0, rescue = null, details = { people: 0 };
let answered = new Set(JSON.parse(localStorage.getItem("khabardar_answered") || "[]"));
let alertActive = false, sirenMuted = false, cycleTimer = null, wakeLock = null, coords = null;

function save() { settings.lang = lang; localStorage.setItem("khabardar", JSON.stringify(settings)); }
function t(k, vars) { let s = (T[lang] && T[lang][k]) || T.en[k] || k; if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace("{" + a + "}", b); return s; }
function show(id) { ["setup", "idle", "alert", "done", "report"].forEach((s) => ($(s).hidden = s !== id)); window.scrollTo(0, 0); }
function vName(v) { return RTL[lang] ? v.name_ur || v.name : v.name; }

function applyLang() {
  document.documentElement.lang = lang;
  document.body.dir = RTL[lang] ? "rtl" : "ltr";
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  document.querySelectorAll("#langs button").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
  fillVillageSelects();
  if (!$("idle").hidden) renderIdle();
  if (!$("done").hidden) renderRescue();
}
function fillVillageSelects() {
  const groups = {};
  VILLAGES.forEach((v) => (groups[v.province] = groups[v.province] || []).push(v));
  const label = (v) => (RTL[lang] ? `${v.name_ur} — ${v.name}` : `${v.name} (${v.district})`);
  const opts = Object.entries(groups).map(([p, vs]) => `<optgroup label="${escHtml(RTL[lang] ? PROVINCE_UR[p] : PROVINCE_NAMES[p])}">${vs.map((v) => `<option value="${v.id}">${escHtml(label(v))}</option>`).join("")}</optgroup>`).join("");
  const sel = $("village").value || settings.village || "mingora", fam = $("family").value || settings.family || "";
  const rsel = $("rVillage").value || settings.village || "mingora";
  $("village").innerHTML = opts; $("family").innerHTML = `<option value="">—</option>` + opts; $("rVillage").innerHTML = opts;
  $("village").value = VMAP[sel] ? sel : "mingora"; $("family").value = VMAP[fam] ? fam : ""; $("rVillage").value = VMAP[rsel] ? rsel : "mingora";
}

// ------------------------------------------------------------- sound: siren + voice
let ctx = null, sirenTimer = null, master = null;
function unlockAudio() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 6; comp.ratio.value = 10; comp.attack.value = 0.003; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = 1;
      master.connect(comp).connect(ctx.destination);
    }
    ctx.resume();
    const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
  } catch (e) { /* no Web Audio */ }
  if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); }
}
function sirenOnce() {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime, g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.05); g.gain.setValueAtTime(0.5, t0 + 1.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
  g.connect(master);
  [["sawtooth", 1], ["square", 1.012]].forEach(([type, mul]) => {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(650 * mul, t0); o.frequency.linearRampToValueAtTime(1450 * mul, t0 + 0.9); o.frequency.linearRampToValueAtTime(650 * mul, t0 + 1.8);
    o.connect(g); o.start(t0); o.stop(t0 + 1.85);
  });
}
function startSiren() { stopSiren(); if (ctx && ctx.state === "suspended") ctx.resume(); sirenOnce(); sirenTimer = setInterval(sirenOnce, 1850); }
function stopSiren() { clearInterval(sirenTimer); sirenTimer = null; }
function playFile(url) {
  return new Promise((resolve, reject) => { const a = new Audio(url); a.onended = () => resolve(true); a.onerror = () => reject(new Error("no file")); a.play().catch(reject); });
}
async function voices() {
  let v = speechSynthesis.getVoices();
  if (v.length) return v;
  await new Promise((r) => { const tm = setTimeout(r, 1500); speechSynthesis.addEventListener("voiceschanged", () => { clearTimeout(tm); r(); }, { once: true }); });
  return speechSynthesis.getVoices();
}
async function speakTTS(text, code) {
  if (!("speechSynthesis" in window)) return false;
  const v = (await voices()).find((x) => x.lang && x.lang.toLowerCase().startsWith(code));
  if (!v) return false;
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = 0.95;
    const done = () => resolve(true); u.onend = done; u.onerror = done;
    speechSynthesis.cancel(); speechSynthesis.speak(u); setTimeout(done, 20000);
  });
}
const missingAudio = new Set();
async function speakAlert(a) {
  const file = `audio/${lang}_${a.level}.mp3`;
  if (!missingAudio.has(file)) {
    try { await playFile(file); return; } catch (e) { missingAudio.add(file); /* no recording: use the phone's voice */ }
  }
  const order = lang === "en" ? ["en"] : ["ur", "en"];
  for (const code of order) if (await speakTTS(`${a.texts[code].title}. ${a.texts[code].body}`, code)) return;
}
async function alertCycle() {
  if (!alertActive || sirenMuted) return;
  startSiren();
  if (navigator.vibrate) navigator.vibrate([900, 300, 900, 300, 900, 300, 900]);
  await sleep(5600); stopSiren();
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

// ------------------------------------------------------------- relay (with an outbox for when there is no signal)
function outbox() { try { return JSON.parse(localStorage.getItem("kh_outbox") || "[]"); } catch (e) { return []; } }
function saveOutbox(list) { localStorage.setItem("kh_outbox", JSON.stringify(list.slice(-50))); renderOutbox(); }
function renderOutbox() {
  const n = outbox().length, el = $("outboxNote");
  el.hidden = !n; el.textContent = n ? t("outboxWaiting", { n }) : "";
}
async function send(obj) {
  const msg = Object.assign({ pid: settings.id, t: Date.now() / 1000 }, obj);
  if (navigator.onLine !== false && await publish(settings.room, msg)) return true;
  if (msg.type !== "ack") saveOutbox(outbox().concat([{ room: settings.room, msg }]));   // receipts are not worth queueing
  return false;
}
let flushing = false;
async function flushOutbox() {
  const list = outbox();
  if (!list.length || flushing || navigator.onLine === false) return;
  flushing = true;
  const left = [];
  for (const item of list) if (!(await publish(item.room, item.msg))) left.push(item);
  flushing = false;
  saveOutbox(left);
  if (list.length > left.length && !$("done").hidden && lastAnswer && !left.some((i) => i.msg.type === "respond")) {
    $("gpsNote").textContent = lastAnswer.status === "help" ? t(coords ? "gpsShared" : "gpsNot") : t("sentOk");
    $("retryBtn").hidden = true;
  }
}
window.addEventListener("online", flushOutbox);
setInterval(flushOutbox, 15000);
function connect() {
  if (es) es.close();
  setConn("connecting");
  es = subscribe(settings.room, "15m", onRelay, setConn);
}
function setConn(state) {
  if (state === "ok") flushOutbox();
  $("conn").className = "conn " + (state === "ok" ? "ok" : state === "bad" ? "bad" : "");
  $("connText").textContent = state === "ok" ? t("connected") : state === "bad" ? t("offline") : t("connecting");
}
function myVillageFor(alert) {
  for (const vid of [settings.village, settings.family]) if (vid && (alert.villages || []).includes(vid)) return vid;
  if (alert.center && alert.radius_km && coords && haversineKm(alert.center[0], alert.center[1], coords.lat, coords.lon) <= alert.radius_km) return nearestVillage(coords.lat, coords.lon).id;
  return null;
}
function onRelay(m) {
  const tm = m._time || Date.now() / 1000;
  if (m.type === "reset") {
    lastReset = Math.max(lastReset, tm);
    answered.clear(); localStorage.setItem("khabardar_answered", "[]"); scenario = {}; rescue = null;
    if (alertActive || !$("done").hidden || !$("alert").hidden) { endAlertSound(); current = null; show("idle"); }
    renderIdle();
  } else if (m.type === "scenario") {
    m.on ? (scenario[m.village] = true) : delete scenario[m.village];
    refreshRisk();
  } else if (m.type === "rescue") {
    if (m.pid !== settings.id || tm < lastReset) return;
    rescue = { status: m.status, team: m.team, eta: m.eta_min };
    renderRescue();
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
  } else if (m.type === "alert") {
    if (tm < lastReset || Date.now() / 1000 - tm > 1800 || answered.has(m.id)) return;
    if (current && current.alert_id === m.id) return;
    const vid = myVillageFor(m);
    if (!vid) return;
    const v = VMAP[vid];
    showAlert({ alert_id: m.id, level: m.level, test: m.test, village: v, safe: v.safe, texts: buildTexts(m.level, v), auto: !!m.auto, reason: (m.reasons || {})[vid] || null });
  }
}

function showAlert(a) {
  current = a; details = { people: 0 };
  const tx = a.texts[lang] || a.texts.en;
  $("alert").className = "screen alert " + a.level;
  $("demoTag").hidden = !a.test;
  $("aTitle").textContent = tx.title;
  $("aPlace").textContent = vName(a.village);
  $("aBody").textContent = tx.body;
  const why = reasonText(a.reason, lang);
  $("aWhy").hidden = !why && !a.auto;
  $("aWhy").innerHTML = `<b>${escHtml(t(a.auto ? "autoWhy" : "why"))}</b>${escHtml(why)}`;
  $("aSafe").textContent = RTL[lang] ? a.safe.name_ur || a.safe.name : a.safe.name;
  const from = coords || a.village;
  $("aDist").textContent = t("away", { km: haversineKm(from.lat, from.lon, a.safe.lat, a.safe.lon).toFixed(1) });
  $("routeBtn").href = `https://www.google.com/maps/dir/?api=1&destination=${a.safe.lat},${a.safe.lon}&travelmode=walking`;
  show("alert");
  send({ type: "ack", alert_id: a.alert_id, stage: "delivered", village: a.village.id });
  if (document.hidden && "Notification" in window && Notification.permission === "granted") {
    try { new Notification("⚠ " + tx.title, { body: tx.body, requireInteraction: true }); } catch (e) { /* not allowed */ }
  }
  alertActive = true; sirenMuted = false;
  alertCycle();
  // report "siren played" only when the sound really started
  setTimeout(() => { if (current && current.alert_id === a.alert_id && ctx && ctx.state === "running") send({ type: "ack", alert_id: a.alert_id, stage: "played", village: a.village.id }); }, 1500);
}

function freshGps(ms) {
  if (!settings.gps || !navigator.geolocation || !window.isSecureContext) return Promise.resolve(null);
  return new Promise((res) => {
    const tm = setTimeout(() => res(null), ms);
    navigator.geolocation.getCurrentPosition((p) => { clearTimeout(tm); res({ lat: +p.coords.latitude.toFixed(5), lon: +p.coords.longitude.toFixed(5) }); }, () => { clearTimeout(tm); res(null); },
      { timeout: ms, enableHighAccuracy: true, maximumAge: 60000 });
  });
}
let lastAnswer = null;
async function respond(status) {
  if (!current) return;
  endAlertSound();
  const a = current;
  answered.add(a.alert_id); localStorage.setItem("khabardar_answered", JSON.stringify([...answered]));
  // show the answer screen at once; sending (and the GPS fix for help) happens in the background
  $("doneIcon").textContent = status === "safe" ? "✓" : "!";
  $("doneIcon").style.background = status === "safe" ? "var(--green)" : "var(--red)";
  $("doneTitle").textContent = t(status === "safe" ? "doneSafeTitle" : "doneHelpTitle");
  $("doneText").textContent = t(status === "safe" ? "doneSafeText" : "doneHelpText");
  $("detailsCard").hidden = status !== "help";
  $("detailsDone").hidden = true; $("sendDetails").hidden = false;
  document.querySelectorAll("#peopleOpts button, #needOpts button").forEach((b) => b.classList.remove("on"));
  details = { people: 0 };
  rescue = null; renderRescue();
  show("done");
  lastAnswer = { a, status };
  await sendAnswer();
}
async function sendAnswer() {
  if (!lastAnswer) return;
  const { a, status } = lastAnswer;
  $("retryBtn").hidden = true;
  $("gpsNote").textContent = t("sending");
  if (status === "help") { const g = await freshGps(5000); if (g) coords = g; }
  const body = { type: "respond", alert_id: a.alert_id, status, village: a.village.id };
  if (coords) { body.lat = coords.lat; body.lon = coords.lon; }
  const ok = await send(body);
  if (!ok) { $("gpsNote").textContent = t("savedOffline"); $("retryBtn").hidden = false; return; }
  $("gpsNote").textContent = status === "help" ? t(coords ? "gpsShared" : "gpsNot") : t("sentOk");
}
$("peopleOpts").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  document.querySelectorAll("#peopleOpts button").forEach((x) => x.classList.toggle("on", x === b));
  details.people = +b.dataset.n;
});
$("needOpts").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; b.classList.toggle("on"); details[b.dataset.k] = b.classList.contains("on"); });
$("sendDetails").addEventListener("click", async () => {
  if (!current) return;
  const body = Object.assign({ type: "help_details", alert_id: current.alert_id, people: details.people || 1 }, details);
  if (coords) { body.lat = coords.lat; body.lon = coords.lon; }
  $("sendDetails").disabled = true;
  const ok = await send(body);
  $("sendDetails").disabled = false;
  if (ok) { $("sendDetails").hidden = true; $("detailsDone").hidden = false; }
  else { $("gpsNote").textContent = t("savedOffline"); $("sendDetails").hidden = true; }
});
$("retryBtn").addEventListener("click", sendAnswer);
function renderRescue() {
  for (const id of ["rescueBox", "idleRescue"]) {
    const box = $(id);
    if (!rescue || rescue.status === "waiting") { box.hidden = true; continue; }
    box.hidden = false;
    box.classList.toggle("done", rescue.status === "rescued");
    box.textContent = rescue.status === "rescued" ? t("rescued") : t("teamComing", { team: rescue.team || "", eta: rescue.eta || "?" });
  }
}

// ------------------------------------------------------------- idle screen
async function refreshRisk() {
  const ids = [settings.village, settings.family].filter((x) => VMAP[x]);
  if (!ids.length) return;
  const vs = ids.map((id) => VMAP[id]);
  const wx = await fetchWeather(vs);
  let live = liveView({ wx, nasa: null, scenario, ids });
  paintRisk(live);
  const nasa = await NASA.sampleVillages(vs).catch(() => null);
  live = liveView({ wx, nasa, scenario, ids });
  paintRisk(live);
}
function paintRisk(live) {
  const d = live.villages[settings.village];
  if (!d) return;
  $("riskNow").textContent = `${t("levels")[d.level] || d.level} (${d.score})`;
  $("riskDetail").textContent = `${t("rain")}: ${d.rain_24h ?? "–"} mm · ${t("river")}: ${d.river_ratio != null ? d.river_ratio + "×" : "n/a"}`;
  $("nasaLine").textContent = !d.nasa_ok ? "" : (d.nasa_flood_px >= 3 && d.nasa_flood_frac >= 0.01) ? t("nasaFlood") : d.nasa_cloud_frac > 0.6 ? t("nasaCloud") : t("nasaClear");
}
function renderIdle() {
  const ids = [settings.village, settings.family].filter((x) => VMAP[x]);
  $("idleVillages").textContent = ids.map((id) => vName(VMAP[id])).join(" · ");
  renderRescue();
  refreshRisk();
}
async function requestWakeLock() { try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) { /* not allowed */ } }
document.addEventListener("visibilitychange", () => { if (!document.hidden) { requestWakeLock(); if (ctx) ctx.resume(); } });

// ------------------------------------------------------------- setup flow
$("langs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; lang = b.dataset.lang; save(); applyLang(); });
$("startBtn").addEventListener("click", async () => {
  if (!settings.room) return;
  unlockAudio();
  settings.village = $("village").value;
  settings.family = $("family").value && $("family").value !== settings.village ? $("family").value : "";
  settings.name = $("name").value.trim();
  settings.gps = $("useGps").checked;
  save();
  if ("Notification" in window && window.isSecureContext && Notification.permission === "default") { try { Notification.requestPermission(); } catch (e) { /* ignore */ } }
  requestWakeLock();
  $("startBtn").disabled = true; $("startBtn").textContent = t("connecting");
  coords = await freshGps(8000);
  const ok = await send({ type: "join", name: settings.name, villages: [settings.village, settings.family].filter(Boolean), lang, lat: coords?.lat ?? null, lon: coords?.lon ?? null });
  $("startBtn").disabled = false; $("startBtn").textContent = t("start");
  renderIdle(); show("idle"); connect();
  if (!ok) setConn("bad");
});
// ------------------------------------------------------------- report other people who need help
let report = { people: 0 };
function openReport() {
  report = { people: 0 };
  document.querySelectorAll("#rPeople button, #rNeeds button").forEach((b) => b.classList.remove("on"));
  $("rNote").value = ""; $("rDone").hidden = true; $("rSend").hidden = false;
  $("rVillage").value = settings.village || "mingora";
  $("rGpsWrap").hidden = !(window.isSecureContext && navigator.geolocation);
  show("report");
}
$("reportBtn").addEventListener("click", openReport);
$("reportBtn2").addEventListener("click", openReport);
$("rBack").addEventListener("click", () => { show("idle"); renderIdle(); });
$("rPeople").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  document.querySelectorAll("#rPeople button").forEach((x) => x.classList.toggle("on", x === b));
  report.people = +b.dataset.n;
});
$("rNeeds").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; b.classList.toggle("on"); report[b.dataset.k] = b.classList.contains("on"); });
$("rSend").addEventListener("click", async () => {
  if (!settings.room) return;
  $("rSend").disabled = true; $("rDone").hidden = false; $("rDone").textContent = t("sending");
  let g = null;
  if (!$("rGpsWrap").hidden && $("rGps").checked) { const keep = settings.gps; settings.gps = true; g = await freshGps(5000); settings.gps = keep; }
  const rid = Math.random().toString(36).slice(2, 10);
  const ok = await send(Object.assign({ type: "report", rid, name: settings.name, village: $("rVillage").value, people: report.people || 1,
    note: $("rNote").value.trim().slice(0, 80), lat: g ? g.lat : null, lon: g ? g.lon : null }, report));
  $("rSend").disabled = false; $("rSend").hidden = true;
  $("rDone").textContent = ok ? t("reportOk") : t("savedOffline");
});

$("testSound").addEventListener("click", async () => { unlockAudio(); startSiren(); await sleep(3700); stopSiren(); });
$("changeBtn").addEventListener("click", () => show("setup"));
$("safeBtn").addEventListener("click", () => respond("safe"));
$("helpBtn").addEventListener("click", () => respond("help"));
$("stopBtn").addEventListener("click", () => { sirenMuted = true; stopSiren(); clearTimeout(cycleTimer); if ("speechSynthesis" in window) speechSynthesis.cancel(); });
$("backBtn").addEventListener("click", () => { show("idle"); renderIdle(); });
setInterval(() => { if (!$("idle").hidden) refreshRisk(); }, 15 * 60 * 1000);

(function init() {
  save();
  $("name").value = settings.name || "";
  if (window.isSecureContext && navigator.geolocation) { $("gpsWrap").hidden = false; $("useGps").checked = settings.gps !== false; }
  if (!settings.room) { $("noRoom").hidden = false; $("startBtn").disabled = true; $("startBtn").style.opacity = 0.5; }
  applyLang();
  renderOutbox();
  show("setup");
  // keep a copy of the app on the phone, so it opens even without internet (works on https and on this laptop)
  if ("serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
