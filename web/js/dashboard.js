/* Khabardar — control room. State is rebuilt from the relay messages of this room, plus local DUMMY/SIM phones. */
const S = {
  room: null, wx: null, nasa: null, nasaStatus: "loading", replay: null, live: null, scenario: {},
  phones: {}, responses: {}, alerts: [], currentAlert: null, resetAt: 0,
  selected: new Set(), mode: "villages", zoneCenter: null, radiusKm: 20,
  markers: {}, responderMarkers: {}, rescueMarkers: {}, rescueLines: {}, zoneCircle: null, nasaLayers: {}, layers: {},
  tab: "rescue", province: "all"
};
const LEVEL_COLOR = { normal: "#2bb673", watch: "#f5c542", warning: "#f28c28", evacuate: "#e5383b" };
const STATUS_COLOR = { sent: "#c9d6e5", delivered: "#7fc8ff", played: "#f5c542", safe: "#2bb673", help: "#e5383b" };
const RANK = { sent: 0, delivered: 1, played: 2, safe: 3, help: 3 };
const DANGER_KM = { watch: 3, warning: 6, evacuate: 10 };
const $ = (id) => document.getElementById(id);
const esc = escHtml;
const now = () => Date.now() / 1000;

function statusText(r, p) {
  if (!r) return "—";
  if (r.status === "delivered") return p && p.device === "keypad" ? "SMS received" : "Received";
  return { sent: "Sending…", played: "Siren played", safe: "SAFE", help: "NEEDS HELP" }[r.status] || r.status;
}
function phoneTag(p) { return p.dummy ? '<span class="tag dummy">DUMMY</span>' : p.sim ? '<span class="tag sim">SIM</span>' : '<span class="tag real">REAL</span>'; }
function phoneName(p, id) { return (p && p.name) || "Phone " + String(id || "").slice(0, 4); }

// ---------------------------------------------------------------- room + join link
function setupRoom() {
  const urlRoom = new URLSearchParams(location.search).get("room");
  S.room = (urlRoom || localStorage.getItem("khabardar_room") || newRoomCode()).toLowerCase().replace(/[^a-z0-9]/g, "");
  localStorage.setItem("khabardar_room", S.room);
  $("roomCode").textContent = S.room.slice(0, 4).toUpperCase();
  const here = location.href.split(/[?#]/)[0].replace(/[^/]*$/, "");
  const base = (CFG.joinBase ? CFG.joinBase.replace(/\/$/, "") + "/" : here);
  const url = `${base}phone.html?room=${S.room}`;
  $("joinUrl").textContent = url;
  $("qr").innerHTML = "";
  if (window.QRCode) new QRCode($("qr"), { text: url, width: 84, height: 84, correctLevel: QRCode.CorrectLevel.M });
  $("testPhoneLink").href = `${here}phone.html?room=${S.room}&v=mingora&name=${encodeURIComponent("Test phone")}`;
  $("edition").textContent = CFG.edition === "local" ? "local network edition" : "online edition";
  $("relayName").textContent = CFG.edition === "local" ? "this laptop (local relay)" : "ntfy.sh (public)";
}
/* Short on-screen message, so every button visibly does something. */
function toast(msg, ms = 3500) {
  let el = $("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (el.hidden = true), ms);
}
/* Two-click confirmation (browser pop-ups can be blocked, e.g. in embedded browsers). */
function confirmClick(btn, action) {
  if (btn.dataset.armed) { clearTimeout(btn._t); btn.textContent = btn.dataset.label; delete btn.dataset.armed; action(); return; }
  btn.dataset.label = btn.textContent; btn.dataset.armed = "1"; btn.textContent = "Click again to confirm";
  btn._t = setTimeout(() => { btn.textContent = btn.dataset.label; delete btn.dataset.armed; }, 4000);
}
$("newRoomBtn").addEventListener("click", (e) => confirmClick(e.currentTarget, () => {
  localStorage.setItem("khabardar_room", newRoomCode());
  toast("New room — phones must scan the new QR code");
  setTimeout(() => (location.href = location.href.split("?")[0]), 600);
}));

// ---------------------------------------------------------------- map + layers
const map = L.map("map", { zoomControl: true, preferCanvas: false }).setView([30.2, 69.5], 5);
const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(map);
["danger", "alert", "villages", "safe", "teams", "events", "responders", "rescue"].forEach((k) => (S.layers[k] = L.layerGroup()));
map.createPane("dangerPane").style.zIndex = 380;

function nasaLayer(name) {
  if (!S.nasaLayers[name]) {
    const d = S.replay || "latest";
    S.nasaLayers[name] = { flood: () => NASA.floodLayer(d), rain: () => NASA.rainLayer(d), soil: () => NASA.soilLayer(), hazard: () => NASA.hazardLayer(), truecolor: () => NASA.trueColorLayer(d) }[name]();
  }
  return S.nasaLayers[name];
}
function applyLayers() {
  document.querySelectorAll("#layersBody input[data-layer]").forEach((cb) => {
    const name = cb.dataset.layer;
    const layer = ["flood", "rain", "soil", "hazard", "truecolor"].includes(name) ? nasaLayer(name) : S.layers[name];
    const want = cb.checked && (!["safe", "teams"].includes(name) || map.getZoom() >= 8); // pins only when zoomed in
    if (want && !map.hasLayer(layer)) layer.addTo(map);
    if (!want && map.hasLayer(layer)) map.removeLayer(layer);
  });
  if (map.hasLayer(S.nasaLayers.truecolor || {})) osm.setOpacity(0); else osm.setOpacity(1);
}
["alert", "villages", "responders", "rescue"].forEach((k) => S.layers[k].addTo(map));
document.querySelectorAll("#layersBody input[data-layer]").forEach((cb) => cb.addEventListener("change", applyLayers));
$("layersToggle").addEventListener("click", () => { $("layersBody").hidden = !$("layersBody").hidden; $("layersToggle").textContent = $("layersBody").hidden ? "Map layers ▸" : "Map layers ▾"; });
NASA.REPLAYS.forEach((r) => $("nasaDate").insertAdjacentHTML("beforeend", `<option value="${r.date}">NASA replay: ${esc(r.label)}</option>`));
$("nasaDate").addEventListener("change", (e) => setReplay(e.target.value === "latest" ? null : e.target.value));

function setReplay(date) {
  S.replay = date;
  for (const k of ["flood", "rain", "truecolor"]) { if (S.nasaLayers[k]) { if (map.hasLayer(S.nasaLayers[k])) map.removeLayer(S.nasaLayers[k]); delete S.nasaLayers[k]; } }
  applyLayers();
  const r = NASA.REPLAYS.find((x) => x.date === date);
  $("replayBanner").hidden = !date;
  if (date) {
    $("replayBanner").textContent = `NASA REPLAY · ${r ? r.label : date} — risk from the satellite flood map only`;
    addLog(`NASA replay ON: ${r ? r.label : date}. Risk now shows what NASA satellites saw that day (rain and river forecasts paused).`);
    if (date === "2022-08-30") map.flyToBounds([[24.5, 66.5], [29.5, 70.5]], { duration: 1 });
    if (date === "2025-09-05") map.flyToBounds([[29.0, 70.0], [32.8, 75.2]], { duration: 1 });
  } else addLog("NASA replay OFF — back to live data");
  S.nasa = null;
  refreshLive();
}

function villageLevel(id) { return (S.live && S.live.villages[id] && S.live.villages[id].level) || "normal"; }
function drawVillages() {
  for (const v of VILLAGES) {
    const sel = S.selected.has(v.id), lvl = villageLevel(v.id);
    const style = { radius: sel ? 11 : 8, color: sel ? "#ffffff" : "#0b1726", weight: sel ? 4 : 2, fillColor: LEVEL_COLOR[lvl], fillOpacity: 0.95 };
    if (!S.markers[v.id]) {
      const m = L.circleMarker([v.lat, v.lon], style).addTo(S.layers.villages);
      m.on("click", () => onVillageClick(v.id));
      m.bindPopup(() => popupHtml(v), { maxWidth: 320 });
      S.markers[v.id] = m;
    } else S.markers[v.id].setStyle(style);
  }
  updateLabels();
}
function updateLabels() {
  const z = map.getZoom();
  for (const v of VILLAGES) {
    const m = S.markers[v.id]; if (!m) continue;
    const lvl = villageLevel(v.id);
    const perm = z >= 7 || S.selected.has(v.id) || lvl === "warning" || lvl === "evacuate";
    const tt = m.getTooltip();
    if (!tt || tt.options.permanent !== perm) {
      m.unbindTooltip();
      m.bindTooltip(v.name, { permanent: perm, direction: "right", offset: [9, 0], className: "vlabel" });
    }
  }
}
map.on("zoomend", () => { updateLabels(); applyLayers(); });

function drawStatic() {
  for (const v of VILLAGES) {
    const icon = L.divIcon({ className: "", html: '<div style="width:9px;height:9px;background:#7fe0ff;border:2px solid #0b1726"></div>', iconSize: [9, 9] });
    L.marker([v.safe.lat, v.safe.lon], { icon }).addTo(S.layers.safe).bindTooltip(`Safe point (demo): ${v.safe.name}, ${v.name}`);
  }
  for (const t of RESCUE_TEAMS) {
    const icon = L.divIcon({ className: "", html: `<div class="team-pin ${t.kind}">${t.kind === "boat" ? "≈" : "+"}</div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
    L.marker([t.lat, t.lon], { icon }).addTo(S.layers.teams).bindTooltip(`${t.name} (demo team)`);
  }
}
function drawDanger() {
  S.layers.danger.clearLayers();
  for (const v of VILLAGES) {
    const lvl = villageLevel(v.id);
    if (!DANGER_KM[lvl]) continue;
    L.circle([v.lat, v.lon], { pane: "dangerPane", radius: DANGER_KM[lvl] * 1000, color: LEVEL_COLOR[lvl], weight: 1, fillColor: LEVEL_COLOR[lvl], fillOpacity: lvl === "watch" ? 0.1 : 0.18, interactive: false }).addTo(S.layers.danger);
  }
}
async function drawEvents() {
  const evs = await NASA.events();
  S.layers.events.clearLayers();
  for (const e of evs) {
    const icon = L.divIcon({ className: "", html: '<div class="eonet-pin">N</div>', iconSize: [16, 16], iconAnchor: [8, 8] });
    L.marker([e.lat, e.lon], { icon }).addTo(S.layers.events).bindPopup(
      `<b>${esc(e.title)}</b><br>${esc(e.category)} · ${new Date(e.date).toLocaleDateString()}<br><span style="color:#555">NASA EONET (source: ${esc(e.source)})</span><br><a href="${esc(e.link)}" target="_blank" rel="noopener">Event details ↗</a>`);
  }
  if (evs.length) addLog(`NASA EONET: ${evs.length} flood/storm event(s) in the region in the last 12 months shown on the map`);
}

function popupHtml(v) {
  const d = (S.live && S.live.villages[v.id]) || {};
  const ph = Object.values(S.phones).filter((p) => (p.villages || []).includes(v.id));
  const real = ph.filter((p) => !p.dummy && !p.sim).length;
  const num = (x, unit = "") => (x == null ? "–" : x + unit);
  const sat = d.nasa_ok ? `${((d.nasa_flood_frac || 0) * 100).toFixed(1)}% <span style="color:#777">(${esc(d.nasa_flood_src || "")}${d.nasa_cloud_frac > 0.3 ? ", cloud " + Math.round(d.nasa_cloud_frac * 100) + "%" : ""})</span>` : "–";
  return `<b>${esc(v.name)}</b> · ${esc(v.district)}, ${esc(PROVINCE_NAMES[v.province])}<br><span style="color:#666">${esc(v.river)}</span>
    <div class="pop-grid">
      ${d.replay ? "" : `<span>Rain next 24 h</span><b>${num(d.rain_24h, " mm")}</b><span>Heaviest hour</span><b>${num(d.rain_max_1h, " mm")}</b>
      <span>River vs normal (GloFAS)</span><b>${d.river_ratio != null ? d.river_ratio + "×" : "n/a"}</b>
      <span>NASA rain (latest)</span><b>${num(d.nasa_rain_now, " mm/h")}${d.nasa_snow ? " (snow nearby)" : ""}</b>
      <span>NASA soil wetness</span><b>${d.nasa_soil != null ? d.nasa_soil.toFixed(2) + " m³/m³" + (d.wet_factor > 1 ? ` (rain ×${d.wet_factor})` : "") : "–"}</b>`}
      <span>NASA flood water ≤ 6 km</span><b>${sat}</b>
    </div>
    Risk: <b>${d.score ?? "–"}</b> <span class="lvl ${d.level || "normal"}">${(d.level || "normal").toUpperCase()}</span> <span style="color:#666">driven by ${d.driver || "–"}</span>${d.test ? '<span class="test">TEST</span>' : ""}${d.replay ? '<span class="rpl">REPLAY</span>' : ""}<br>
    Phones watching: <b>${ph.length}</b> (${real} real)<br>
    <button class="mini" onclick="toggleSelect('${v.id}')">${S.selected.has(v.id) ? "Remove from alert" : "Add to alert"}</button>
    ${d.replay ? "" : `<button class="mini" onclick="toggleScenario('${v.id}', ${!d.test})">${d.test ? "Turn TEST off" : "Simulate heavy rain (TEST)"}</button>`}`;
}
function onVillageClick(id) {
  if (S.mode !== "villages") return;
  S.selected.has(id) ? S.selected.delete(id) : S.selected.add(id);
  drawVillages(); renderSelection();
}
window.toggleSelect = (id) => { S.selected.has(id) ? S.selected.delete(id) : S.selected.add(id); drawVillages(); renderSelection(); map.closePopup(); };
map.on("click", (e) => { if (S.mode === "zone") { S.zoneCenter = [e.latlng.lat, e.latlng.lng]; drawZone(); } });
function drawZone() {
  if (S.zoneCircle) { map.removeLayer(S.zoneCircle); S.zoneCircle = null; }
  if (S.mode === "zone" && S.zoneCenter) {
    S.zoneCircle = L.circle(S.zoneCenter, { radius: S.radiusKm * 1000, color: "#f05a28", weight: 2, fillOpacity: 0.12 }).addTo(map);
    S.selected = new Set(VILLAGES.filter((v) => haversineKm(S.zoneCenter[0], S.zoneCenter[1], v.lat, v.lon) <= S.radiusKm).map((v) => v.id));
  }
  drawVillages(); renderSelection();
}
window.toggleScenario = (id, on) => {
  on ? (S.scenario[id] = true) : delete S.scenario[id];
  publish(S.room, { type: "scenario", village: id, on });
  addLog(`TEST heavy-rain scenario ${on ? "ON" : "OFF"} for ${VMAP[id].name} (simulated values)`);
  recompute(); map.closePopup();
};

// ---------------------------------------------------------------- composer
document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener("change", (e) => {
  S.mode = e.target.value; $("zoneRow").hidden = S.mode !== "zone";
  $("mapHint").textContent = S.mode === "zone" ? "Click the map to place the danger zone" : "Click places to select them · or switch to “Draw zone” and click the map";
  if (S.mode === "villages") S.zoneCenter = null;
  S.selected.clear(); drawZone();
}));
$("radius").addEventListener("input", (e) => { S.radiusKm = +e.target.value; $("radiusVal").textContent = S.radiusKm; drawZone(); });
$("level").addEventListener("change", renderPreview);
$("selectRiskBtn").addEventListener("click", () => {
  const ids = VILLAGES.filter((v) => ["warning", "evacuate"].includes(villageLevel(v.id))).map((v) => v.id);
  if (!ids.length) {
    const msg = "No place is at Warning or Evacuate right now. Use a TEST scenario (click a place) or a NASA replay (Map layers → NASA date).";
    $("sendResult").textContent = msg; toast(msg, 5000); return;
  }
  toast(`${ids.length} place(s) at Warning or Evacuate selected`);
  S.selected = new Set(ids); drawVillages(); renderSelection();
  if (ids.some((id) => villageLevel(id) === "evacuate")) $("level").value = "evacuate";
  renderPreview();
  map.fitBounds(L.latLngBounds(ids.map((id) => [VMAP[id].lat, VMAP[id].lon])).pad(0.4), { maxZoom: 10 });
});
$("clearSelBtn").addEventListener("click", () => { S.selected.clear(); S.zoneCenter = null; drawZone(); });
function renderSelection() {
  const ids = [...S.selected];
  $("selChips").innerHTML = ids.length ? ids.map((id) => `<span class="chip">${esc(VMAP[id].name)}</span>`).join("")
    : `<span class="muted">${S.mode === "zone" ? "Click the map to draw a zone" : "No place selected"}</span>`;
  renderPreview();
}
function renderPreview() {
  const id = [...S.selected][0];
  if (!id) { $("preview").innerHTML = '<span class="muted">Message preview appears here.</span>'; return; }
  const level = $("level").value, t = buildTexts(level, VMAP[id]);
  const n = Object.values(S.phones).filter((p) => phoneMatches(p, { villages: [...S.selected], center: S.mode === "zone" ? S.zoneCenter : null, radius_km: S.radiusKm })).length;
  $("preview").innerHTML = `<b>${esc(t.en.title)}</b> — ${esc(t.en.body)}<div class="ur"><b>${esc(t.ur.title)}</b> — ${esc(t.ur.body)}</div>
    <div class="muted small">Keypad phones get an SMS: “${esc(smsText(level, VMAP[id], $("isTest").checked))}”</div>
    <div class="muted small">Will reach <b>${n}</b> phone(s) now · each in its chosen language (Urdu or English) with a siren and voice.</div>`;
}

function phoneMatches(p, alert) {
  for (const vid of p.villages || []) if (alert.villages.includes(vid)) return vid;
  if (alert.center && alert.radius_km && p.lat != null && !p.family && haversineKm(alert.center[0], alert.center[1], p.lat, p.lon) <= alert.radius_km) return nearestVillage(p.lat, p.lon).id;
  return null;
}

$("sendBtn").addEventListener("click", async () => {
  const villages = [...S.selected];
  if (!villages.length) { $("sendResult").textContent = "Choose at least one place or draw a zone."; toast("First choose a place on the map (or draw a zone), then press SEND ALERT"); return; }
  const alert = { type: "alert", id: Math.random().toString(36).slice(2, 10), level: $("level").value, villages,
                  center: S.mode === "zone" ? S.zoneCenter : null, radius_km: S.mode === "zone" ? S.radiusKm : null,
                  test: $("isTest").checked, t: now() };
  $("sendBtn").disabled = true; $("sendResult").textContent = "Sending…";
  const ok = await publish(S.room, alert);
  setTimeout(() => ($("sendBtn").disabled = false), 800);
  if (!ok) { $("sendResult").textContent = "Could not reach the relay — check the connection and press SEND again."; return; }
  handle(alert, true);
  zoomToAlert(alert);
  setTab("wall");
});
function zoomToAlert(alert) {
  if (alert.center && S.zoneCircle) { map.fitBounds(S.zoneCircle.getBounds()); return; }
  const pts = alert.villages.map((id) => VMAP[id]).flatMap((v) => [[v.lat, v.lon], [v.safe.lat, v.safe.lon]]);
  if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.6), { maxZoom: 12 });
}
function drawAlertArea(alert) {
  S.layers.alert.clearLayers();
  if (!alert) return;
  for (const id of alert.villages) {
    const v = VMAP[id]; if (!v) continue;
    L.circle([v.lat, v.lon], { radius: 4000, color: LEVEL_COLOR[alert.level], weight: 3, dashArray: "8 6", fill: false, interactive: false }).addTo(S.layers.alert);
    L.polyline([[v.lat, v.lon], [v.safe.lat, v.safe.lon]], { color: "#7fe0ff", weight: 3, dashArray: "2 6", interactive: false }).addTo(S.layers.alert);
  }
}

// ---------------------------------------------------------------- relay messages -> state
function handle(m, local) {
  const t = m._time ?? now();  // relay time keeps ordering consistent across devices
  if (m.type === "reset") {
    if (t > S.resetAt) {
      S.resetAt = t; S.responses = {}; S.alerts = []; S.currentAlert = null; S.scenario = {};
      for (const id of Object.keys(S.phones)) if (S.phones[id].sim) delete S.phones[id];
      $("log").innerHTML = ""; $("sendResult").textContent = ""; drawAlertArea(null); recompute();
      addLog("Demo reset — alerts, answers, rescue list, TEST scenarios and SIM phones cleared (real and dummy phones stay)");
    }
  } else if (t < S.resetAt) {
    if (m.type === "join") upsertPhone(m); // phones stay joined across resets
    return;
  } else if (m.type === "join") {
    const isNew = !S.phones[m.pid];
    upsertPhone(m);
    if (isNew || !local) addLog(`${m.name || "A phone"} joined (${(m.lang || "").toUpperCase()}) — watching ${(m.villages || []).map((v) => VMAP[v]?.name).filter(Boolean).join(", ")}`);
  } else if (m.type === "alert") {
    if (S.alerts.some((a) => a.id === m.id)) return;
    m.villages = (m.villages || []).filter((id) => VMAP[id]);
    S.alerts.push(m); S.currentAlert = m;
    let n = 0, sms = 0;
    for (const p of Object.values(S.phones)) {
      const vid = phoneMatches(p, m);
      if (!vid) continue;
      n++; if (p.device === "keypad") sms++;
      S.responses[m.id + "|" + p.id] = { alert_id: m.id, phone_id: p.id, village_id: vid, status: "sent", t_sent: t, lat: null, lon: null };
      if (p.dummy || p.sim) Dummies.simulate(m, p);
    }
    drawAlertArea(m);
    $("sendResult").textContent = `Sent to ${n} phone(s) at ${fmtTime(m.t || t)}${sms ? ` · ${sms} by SMS` : ""}.`;
    addLog(`${m.level.toUpperCase()} sent to ${n} phone(s) — ${m.villages.map((v) => VMAP[v].name).join(", ")}${m.test ? " [DEMO]" : ""}`);
  } else if (m.type === "ack" || m.type === "respond") {
    const key = m.alert_id + "|" + m.pid;
    let r = S.responses[key];
    if (!r) {
      const a = S.alerts.find((x) => x.id === m.alert_id);
      if (!a) return;
      r = S.responses[key] = { alert_id: m.alert_id, phone_id: m.pid, village_id: VMAP[m.village] ? m.village : a.villages[0], status: "sent", t_sent: t };
    }
    const status = m.type === "ack" ? m.stage : m.status;
    if (RANK[status] == null) return;
    if (RANK[status] >= RANK[r.status]) r.status = status;
    r.channel = "app";
    if (m.lat != null) { r.lat = m.lat; r.lon = m.lon; r.gps = true; }
    if (m.type === "respond") {
      r.t_answer = t;
      if (status === "help") { r.t_help = r.t_help || t; r.rescue = r.rescue || { status: "waiting" }; }
      addLog(`${phoneName(S.phones[m.pid], m.pid)} — ${status === "safe" ? "SAFE" : "NEEDS HELP"} (${VMAP[r.village_id]?.name || ""})${m.lat != null ? " · GPS shared" : ""}`);
    }
  } else if (m.type === "help_details") {
    const r = S.responses[m.alert_id + "|" + m.pid];
    if (r) { r.details = { people: +m.people || 1, injured: !!m.injured, elderly: !!m.elderly, children: !!m.children, pregnant: !!m.pregnant, water: !!m.water };
      if (m.lat != null) { r.lat = m.lat; r.lon = m.lon; r.gps = true; }
      addLog(`${phoneName(S.phones[m.pid], m.pid)} sent help details: ${r.details.people} people${r.details.injured ? ", injured" : ""}${r.details.water ? ", water rising" : ""}`); }
  } else if (m.type === "rescue") {
    if (!local) Rescue.applyRemote(m);
  } else if (m.type === "scenario") {
    m.on ? (S.scenario[m.village] = true) : delete S.scenario[m.village];
    recompute();
  }
  scheduleRender();
}
function upsertPhone(m) {
  S.phones[m.pid] = Object.assign(S.phones[m.pid] || {}, { id: m.pid, name: m.name, villages: (m.villages || []).filter((v) => VMAP[v]), lang: m.lang,
    lat: m.lat, lon: m.lon, joined: m.t, device: "smart" });
}

// ---------------------------------------------------------------- rendering
let _renderQueued = false;
function scheduleRender() {
  if (_renderQueued) return;
  _renderQueued = true;
  const run = () => { if (!_renderQueued) return; _renderQueued = false; renderAll(); };
  requestAnimationFrame(run);
  setTimeout(run, 250); // animation frames pause in hidden tabs; keep the screen current anyway
}
function currentResponses() { return S.currentAlert ? Object.values(S.responses).filter((r) => r.alert_id === S.currentAlert.id) : []; }
function renderAll() {
  const rs = currentResponses(), all = Object.values(S.phones);
  const real = all.filter((p) => !p.dummy && !p.sim).length, dummy = all.filter((p) => p.dummy).length, sim = all.filter((p) => p.sim).length;
  $("cPhones").textContent = all.length;
  $("cPhonesL").textContent = `Phones (${real} real)`;
  $("cPhones").title = `${real} real · ${dummy} dummy · ${sim} simulated`;
  $("cWarned").textContent = rs.length;
  $("cReached").textContent = rs.filter((r) => RANK[r.status] >= 1).length;
  $("cSafe").textContent = rs.filter((r) => r.status === "safe").length;
  $("cHelp").textContent = rs.filter((r) => r.status === "help").length;
  $("cNoAns").textContent = rs.filter((r) => RANK[r.status] < 3 && !(S.phones[r.phone_id] || {}).family).length;
  $("alertMeta").textContent = S.currentAlert ? `· ${S.currentAlert.level.toUpperCase()} at ${fmtTime(S.currentAlert.t)}${S.currentAlert.test ? " (DEMO)" : ""}` : "";
  $("tPhones").textContent = all.length;
  renderPhones(rs); renderWall(rs); Rescue.render(); drawResponders(rs); Rescue.drawMap();
}
function sortedPhones() {
  const k = (p) => (p.dummy ? 2 : p.sim ? 1 : 0);
  return Object.values(S.phones).sort((a, b) => k(a) - k(b) || (b.joined || 0) - (a.joined || 0) || String(a.name).localeCompare(String(b.name)));
}
function renderPhones(rs) {
  if (S.tab !== "phones") return;
  const rows = sortedPhones().map((p) => {
    const r = rs.find((x) => x.phone_id === p.id);
    const where = (p.villages || []).map((v) => VMAP[v]?.name).filter(Boolean).join(", ");
    return `<div class="prow"><span>${esc(phoneName(p, p.id))}${phoneTag(p)}${p.device === "keypad" ? '<span class="tag sms">SMS</span>' : ""} <span class="muted">· ${esc(where)} · ${esc((p.lang || "").toUpperCase())}</span></span>
      <span class="st ${r ? r.status : ""}">${r ? statusText(r, p) : '<span class="muted">protected</span>'}</span></div>`;
  });
  $("plist").innerHTML = rows.join("") || '<span class="muted">No phones yet — ask the judges to scan the QR code.</span>';
}
function renderWall(rs) {
  if (S.tab !== "wall") return;
  const ORDER = { help: 0, played: 1, delivered: 2, sent: 3, safe: 4 };
  let cards;
  if (S.currentAlert) {
    cards = rs.map((r) => ({ p: S.phones[r.phone_id] || { id: r.phone_id }, r }))
      .sort((a, b) => (a.p.dummy || a.p.sim ? 1 : 0) - (b.p.dummy || b.p.sim ? 1 : 0) || ORDER[a.r.status] - ORDER[b.r.status]);
  } else cards = sortedPhones().slice(0, 60).map((p) => ({ p, r: null }));
  if (!cards.length) { $("wall").innerHTML = '<span class="muted small">No phone is in the alert area. Select places with phones, or turn dummy phones on.</span>'; return; }
  const a = S.currentAlert;
  $("wall").innerHTML = cards.map(({ p, r }) => {
    const v = VMAP[(r && r.village_id) || (p.villages || [])[0]];
    let scr;
    if (!r) scr = `<div class="scr">✓ Protected</div>`;
    else if (r.status === "safe") scr = `<div class="scr safe">✓ SAFE</div>`;
    else if (r.status === "help") scr = `<div class="scr help">! NEEDS HELP</div>`;
    else if (r.status === "sent") scr = `<div class="scr">Sending…</div>`;
    else if (p.device === "keypad") scr = `<div class="scr sms">✉ ${esc(smsText(a.level, v, a.test).slice(0, 70))}…</div>`;
    else { const tx = buildTexts(a.level, v)[p.lang] || buildTexts(a.level, v).en; scr = `<div class="scr ${a.level} ring ${p.lang !== "en" ? "rtl" : ""}">${esc(tx.title)}</div>`; }
    return `<div class="mph" onclick="showPhone('${p.id}')" title="Click to see this phone's screen">
      <div class="who">${esc(phoneName(p, p.id))}</div>
      <div class="where">${esc(v ? v.name : "")} · ${esc((p.lang || "").toUpperCase())}${p.device === "keypad" ? " · keypad" : ""}</div>
      ${scr}
      <div class="stl">${phoneTag(p)} ${r ? esc(statusText(r, p)) : ""}</div></div>`;
  }).join("");
}
window.showPhone = (pid) => {
  const p = S.phones[pid] || { id: pid }, a = S.currentAlert, r = a && S.responses[a.id + "|" + pid];
  const v = VMAP[(r && r.village_id) || (p.villages || [])[0]];
  $("pmTitle").innerHTML = `${esc(phoneName(p, pid))} ${phoneTag(p)}`;
  let body;
  if (!r) body = `<div class="pm-phone"><div class="pm-screen"><h3>✓</h3><p>Protected — watching ${esc((p.villages || []).map((x) => VMAP[x]?.name).join(", "))}</p></div></div>`;
  else if (p.device === "keypad") body = `<div class="pm-phone"><div class="pm-screen"><div class="pm-sms">${esc(smsText(a.level, v, a.test))}</div><p class="small">Keypad phone · SMS ${r.status === "sent" ? "sending…" : "received"}</p></div></div>`;
  else {
    const tx = buildTexts(a.level, v)[p.lang] || buildTexts(a.level, v).en, rtl = p.lang !== "en";
    const safe = rtl ? v.safe.name_ur : v.safe.name;
    body = `<div class="pm-phone"><div class="pm-screen ${a.level}" dir="${rtl ? "rtl" : "ltr"}">${a.test ? '<div class="small">DEMO</div>' : ""}<h3>${esc(tx.title)}</h3>
      <b>${esc(rtl ? v.name_ur : v.name)}</b><p>${esc(tx.body)}</p><div class="pm-safe">→ ${esc(safe)}</div>
      <div class="pm-btns"><span style="background:#1f9d5c">${p.lang === "en" ? "I'm safe" : "✓"}</span><span style="background:#d62828">${p.lang === "en" ? "I need help" : "!"}</span></div></div></div>`;
  }
  const meta = r ? `Status: <b>${esc(statusText(r, p))}</b>${r.details ? "<br>Help details: " + Rescue.needsHtml(r.details) : ""}${r.rescue ? `<br>Rescue: <b>${esc(r.rescue.status)}</b>${r.rescue.team ? " · " + esc(r.rescue.team) : ""}` : ""}` : "";
  $("pmBody").innerHTML = body + `<div class="pm-meta">Language: ${esc(LANG_NAMES[p.lang] || p.lang || "")} · ${p.device === "keypad" ? "keypad phone (SMS)" : "smartphone (app / browser)"}${p.family ? " · relative watching a family member's village" : ""}<br>${meta}
    ${p.dummy ? "<br><i>DUMMY phone: answers are automatic, for the demo only.</i>" : p.sim ? "<br><i>SIMULATED phone.</i>" : ""}</div>`;
  $("phoneModal").hidden = false;
};
$("closePhone").addEventListener("click", () => ($("phoneModal").hidden = true));
$("phoneModal").addEventListener("click", (e) => { if (e.target.id === "phoneModal") $("phoneModal").hidden = true; });

function drawResponders(rs) {
  const keep = new Set();
  for (const r of rs) {
    if (r.status === "help") continue; // help requests are drawn by the rescue layer
    const key = r.alert_id + "|" + r.phone_id, p = S.phones[r.phone_id] || {};
    let lat = r.lat ?? p.lat, lon = r.lon ?? p.lon;
    if (lat == null) { const v = VMAP[r.village_id], h = hashStr(r.phone_id); lat = v.lat + ((h % 100) - 50) / 3500; lon = v.lon + (((h >> 7) % 100) - 50) / 3000; }
    keep.add(key);
    const style = { radius: 6, color: "#0b1726", weight: 2, fillColor: STATUS_COLOR[r.status] || "#ccc", fillOpacity: 1 };
    if (!S.responderMarkers[key]) S.responderMarkers[key] = L.circleMarker([lat, lon], style).addTo(S.layers.responders);
    else S.responderMarkers[key].setLatLng([lat, lon]).setStyle(style);
    S.responderMarkers[key].bindTooltip(`${phoneName(p, r.phone_id)}${p.dummy ? " (dummy)" : ""}: ${statusText(r, p)}`);
  }
  for (const k of Object.keys(S.responderMarkers)) if (!keep.has(k)) { S.layers.responders.removeLayer(S.responderMarkers[k]); delete S.responderMarkers[k]; }
}

function setTab(tab) {
  S.tab = tab;
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  ["rescue", "phones", "wall"].forEach((t) => ($("tab-" + t).hidden = t !== tab));
  renderAll();
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setTab(b.dataset.tab); });

// ---------------------------------------------------------------- live data + risk table
async function refreshLive(force) {
  const date = S.replay || "latest";
  if (!S.replay) S.wx = await fetchWeather(VILLAGES, force);
  recompute();
  S.nasaStatus = "loading"; renderBadges();
  const res = await NASA.sampleVillages(VILLAGES, date).catch(() => null);
  if ((S.replay || "latest") !== date) return; // the date changed while loading
  S.nasa = res;
  S.nasaStatus = res && Object.values(res).some((x) => x.nasa_ok) ? "ok" : "bad";
  recompute();
  const flooded = res ? VILLAGES.filter((v) => (res[v.id] || {}).nasa_flood_frac >= 0.01 && res[v.id].nasa_flood_px >= 3) : [];
  if (S.nasaStatus === "ok") addLog(`NASA ${S.replay ? "replay " + S.replay : "satellite data"} checked for ${VILLAGES.length} places — flood water seen near ${flooded.length}${flooded.length ? ": " + flooded.slice(0, 8).map((v) => v.name).join(", ") + (flooded.length > 8 ? "…" : "") : ""}`);
}
function recompute() {
  S.live = liveView({ wx: S.wx, nasa: S.nasa, scenario: S.scenario, replay: S.replay });
  renderBadges(); renderRiskTable(); drawVillages(); drawDanger(); renderPreview();
}
function renderBadges() {
  const b = $("srcBadge"), n = $("nasaBadge");
  if (S.replay) { b.textContent = "Weather: paused during replay"; b.className = "badge off"; }
  else if (S.wx && S.wx.ok) { b.textContent = `LIVE rain & river · ${fmtTime(S.wx.t)}${S.wx.stale ? " (cached)" : ""}`; b.className = "badge live"; }
  else { b.textContent = S.wx ? "Weather data offline" : "Weather…"; b.className = "badge off"; }
  if (S.nasaStatus === "loading") { n.textContent = "NASA satellite: loading…"; n.className = "badge"; }
  else if (S.nasaStatus === "ok") { n.textContent = S.replay ? `NASA REPLAY · ${S.replay}` : "NASA satellite · live"; n.className = "badge " + (S.replay ? "replay" : "live"); }
  else { n.textContent = "NASA data unavailable"; n.className = "badge off"; }
}
function satCell(d) {
  if (!d.nasa_ok) return '<span class="muted">–</span>';
  if ((d.nasa_flood_px || 0) >= 3 && d.nasa_flood_frac >= 0.01) return `<span class="satv flood">flood water ${(d.nasa_flood_frac * 100).toFixed(0)}%</span>`;
  if (d.nasa_cloud_frac > 0.6) return '<span class="satv cloud">cloudy / no view</span>';
  return '<span class="satv">no flood seen</span>';
}
function renderRiskTable() {
  if (!S.live) return;
  const vs = VILLAGES.filter((v) => S.province === "all" || v.province === S.province)
    .sort((a, b) => (S.live.villages[b.id].score - S.live.villages[a.id].score) || a.name.localeCompare(b.name));
  $("riskBody").innerHTML = vs.map((v) => {
    const d = S.live.villages[v.id];
    const nasaSub = !d.replay && d.nasa_ok ? `<div class="sub">rain ${d.nasa_rain_now ?? "–"} mm/h · soil ${d.nasa_soil != null ? d.nasa_soil.toFixed(2) : "–"}</div>` : "";
    return `<tr data-id="${v.id}"><td><b>${esc(v.name)}</b><div class="sub">${esc(v.district)} · ${esc(v.province)}</div></td>
      <td>${d.replay ? "–" : `${d.rain_24h ?? "–"} mm<div class="sub">max ${d.rain_max_1h ?? "–"}/h</div>`}</td>
      <td>${d.replay ? "–" : d.river_ratio != null ? d.river_ratio + "×" : "n/a"}</td>
      <td>${satCell(d)}${nasaSub}</td>
      <td><span class="lvl ${d.level}">${d.score} ${d.level.toUpperCase()}</span>${d.test ? '<span class="test">TEST</span>' : ""}${d.replay ? '<span class="rpl">REPLAY</span>' : ""}<div class="sub">${d.score > 0 ? "by " + d.driver : ""}</div></td></tr>`;
  }).join("");
}
$("riskBody").addEventListener("click", (e) => {
  const tr = e.target.closest("tr[data-id]"); if (!tr) return;
  const v = VMAP[tr.dataset.id];
  map.flyTo([v.lat, v.lon], 10, { duration: 0.7 });
  setTimeout(() => S.markers[v.id].openPopup(), 750);
});
Object.entries(PROVINCE_NAMES).forEach(([k, name]) => $("provFilter").insertAdjacentHTML("beforeend", `<option value="${k}">${esc(name)}</option>`));
$("provFilter").addEventListener("change", (e) => { S.province = e.target.value; renderRiskTable(); });
$("refreshBtn").addEventListener("click", () => { NASA.clearLatest(); refreshLive(true); });

function addLog(text) {
  const div = document.createElement("div");
  div.textContent = `${fmtTime(now())}  ${text}`;
  $("log").prepend(div);
  while ($("log").children.length > 150) $("log").lastChild.remove();
}

// ---------------------------------------------------------------- footer actions
$("resetBtn").title = "Clears alerts, answers, the rescue list, TEST scenarios and SIM phones (real and dummy phones stay)";
$("resetBtn").addEventListener("click", (e) => confirmClick(e.currentTarget, async () => {
  toast("Resetting the demo…");
  const ok = await publish(S.room, { type: "reset" });  // applied when the relay echoes it back
  if (!ok) { addLog("Reset failed — relay not reachable"); toast("Reset failed — the relay is not reachable. Check the connection."); }
  else toast("Demo reset");
}));
$("dummyBtn").addEventListener("click", () => { Dummies.setOn(!Dummies.isOn()); toast(Dummies.isOn() ? `${Dummies.list().length} dummy phones added across Pakistan` : "Dummy phones removed"); });
$("simBtn").addEventListener("click", () => { Dummies.addCrowd([...S.selected]); toast("25 simulated phones added" + (S.selected.size ? " around the selected places" : " around Mingora, Madyan and Bahrain")); });
$("assignAllBtn").addEventListener("click", () => {
  const waiting = Rescue.list().filter((r) => !r.rescue || r.rescue.status === "waiting").length;
  if (!waiting) { toast("Nobody is waiting for a team right now"); return; }
  Rescue.assignAll(); toast(`Nearest teams sent to ${waiting} ${waiting === 1 ? "person" : "people"}`);
});
$("csvBtn").addEventListener("click", () => {
  if (!Rescue.list().length) { toast("No help requests yet — nothing to download"); return; }
  Rescue.csv(); toast("Rescue list downloaded (CSV)");
});
$("replayBtn").addEventListener("click", () => {
  $("replayModal").hidden = false;
  const bars = [{ label: "Day before (May 2025)", v: 35600 }, { label: "Next morning (May 2025)", v: 3177 }, { label: "16 Dec 2025", v: 1800 }];
  let svg = `<svg viewBox="0 0 780 240" width="100%" style="background:#0d1c2f;border-radius:8px">`;
  bars.forEach((b, i) => {
    const bh = (b.v / 36000) * 170, x = 80 + i * 240;
    svg += `<rect x="${x}" y="${200 - bh}" width="150" height="${bh}" rx="6" fill="${i === 0 ? "#3b82c4" : "#e5383b"}"/>
      <text x="${x + 75}" y="${192 - bh}" fill="#eef3f9" font-size="16" font-weight="700" text-anchor="middle">${b.v.toLocaleString()} cusecs</text>
      <text x="${x + 75}" y="222" fill="#9fb1c6" font-size="13" text-anchor="middle">${b.label}</text>`;
  });
  $("replayChart").innerHTML = svg + `<text x="20" y="22" fill="#9fb1c6" font-size="13">Chenab flow at Marala headworks — sudden drops without notice</text></svg>`;
});
$("closeReplay").addEventListener("click", () => ($("replayModal").hidden = true));

setInterval(() => ($("clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })), 1000);
setInterval(() => { if (!S.replay) refreshLive(); }, 15 * 60 * 1000);
setInterval(() => { if (!S.replay) { NASA.clearLatest(); refreshLive(); } }, 60 * 60 * 1000);
setInterval(() => { if (S.tab === "rescue" && Rescue.list().length) Rescue.render(); }, 20000);

(function init() {
  setupRoom();
  drawStatic();
  applyLayers();
  map.invalidateSize();
  map.fitBounds([[24.0, 61.5], [37.0, 77.5]]);
  setTimeout(() => { map.invalidateSize(); map.fitBounds([[24.0, 61.5], [37.0, 77.5]]); }, 300);
  window.addEventListener("resize", () => map.invalidateSize());
  Dummies.init();
  drawVillages(); renderSelection(); renderAll();
  subscribe(S.room, "12h", (m) => handle(m, false), (st) => {
    $("relayBadge").textContent = st === "ok" ? (CFG.edition === "local" ? "Local relay connected" : "Relay connected") : "Relay reconnecting…";
    $("relayBadge").className = "badge " + (st === "ok" ? "live" : "off");
  });
  refreshLive();
  drawEvents();
})();
