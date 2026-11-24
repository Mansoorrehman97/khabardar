/* Khabardar — control room. State is rebuilt from the relay messages of this room, plus local DUMMY/SIM phones. */
const S = {
  room: null, wx: null, nasa: null, nasaStatus: "loading", replay: null, live: null, scenario: {},
  phones: {}, responses: {}, alerts: [], currentAlert: null, resetAt: 0,
  selected: new Set(), mode: "villages", zoneCenter: null, radiusKm: 20,
  markers: {}, responderMarkers: {}, rescueMarkers: {}, rescueLines: {}, zoneCircle: null, nasaLayers: {}, layers: {},
  tab: "rescue", province: "all",
  auto: null, pendingAuto: null, autoCancelled: {}, historyReady: false, clears: [], fx: null
};
const LEVEL_COLOR = { normal: "#2bb673", watch: "#f5c542", warning: "#f28c28", evacuate: "#e5383b" };
const STATUS_COLOR = { sent: "#c9d6e5", delivered: "#7fc8ff", played: "#f5c542", safe: "#2bb673", help: "#e5383b" };
const RANK = { sent: 0, delivered: 1, played: 2, safe: 3, help: 3 };
const $ = (id) => document.getElementById(id);
const esc = escHtml;
const now = () => Date.now() / 1000;

function statusText(r, p) {
  if (!r) return "—";
  if (r.status === "delivered") return p && p.device === "keypad" ? "SMS received" : "Received";
  return { sent: "Sending…", played: "Siren played", safe: "SAFE", help: "NEEDS HELP" }[r.status] || r.status;
}
function phoneTag(p) { return p.dummy ? '<span class="tag dummy">DUMMY</span>' : p.sim ? '<span class="tag sim">SIM</span>' : p.sms ? '<span class="tag sms">SMS</span>' : p.report ? '<span class="src">REPORTED</span>' : '<span class="tag real">REAL</span>'; }
const isRealPhone = (p) => p && !p.dummy && !p.sim && !p.sms && !p.report;
function phoneName(p, id) { return (p && p.name) || "Phone " + String(id || "").slice(0, 4); }

// ---------------------------------------------------------------- room + join link
function setupRoom() {
  const urlRoom = new URLSearchParams(location.search).get("room");
  S.room = (urlRoom || localStorage.getItem("khabardar_room") || newRoomCode()).toLowerCase().replace(/[^a-z0-9]/g, "");
  localStorage.setItem("khabardar_room", S.room);
  $("roomCode").textContent = S.room.slice(0, 4).toUpperCase();
  $("edition").textContent = CFG.edition === "local" ? "local network edition" : "online edition";
  $("relayName").textContent = CFG.edition === "local" ? "this laptop (local relay)" : "ntfy.sh (public)";
}
/* Join link and QR code: they carry the control room's PUBLIC key, so phones can check every alert. */
function renderJoin() {
  const here = location.href.split(/[?#]/)[0].replace(/[^/]*$/, "");
  const base = (CFG.joinBase ? CFG.joinBase.replace(/\/$/, "") + "/" : here);
  const k = S.pubB64 ? `&k=${S.pubB64}` : "";
  const url = `${base}phone.html?room=${S.room}${k}`;
  $("joinUrl").textContent = `${base}phone.html?room=${S.room}${k ? "&k=…" : ""}`;
  $("joinUrl").title = url;
  $("qr").innerHTML = "";
  if (window.QRCode) new QRCode($("qr"), { text: url, width: 84, height: 84, correctLevel: QRCode.CorrectLevel.L });
  $("testPhoneLink").href = `${here}phone.html?room=${S.room}${k}&v=mingora&name=${encodeURIComponent("Test phone")}`;
}
/* This control room's signing key (made once per room in this browser; the private half never leaves it). */
async function loadKeys() {
  if (!canSign()) return;
  const store = "kh_key_" + S.room;
  try {
    let saved = JSON.parse(localStorage.getItem(store) || "null");
    if (!saved) {
      const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
      saved = { priv: await crypto.subtle.exportKey("jwk", kp.privateKey), pub: b64u.enc(await crypto.subtle.exportKey("raw", kp.publicKey)) };
      localStorage.setItem(store, JSON.stringify(saved));
    }
    const priv = await crypto.subtle.importKey("jwk", saved.priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    S.pubB64 = saved.pub;
    S.pubKey = await importPublicKey(saved.pub);
    window.KH_SIGNER = async (obj) => b64u.enc(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, priv, new TextEncoder().encode(canon(obj))));
  } catch (e) { console.warn("signing unavailable", e); }
}
/* Messages from the relay are checked in arrival order; control messages must carry this room's signature. */
let _inbox = Promise.resolve();
function receive(m) {
  _inbox = _inbox.then(async () => {
    if (SIGNED_TYPES.includes(m.type) && S.pubKey && !(await verifyMsg(S.pubKey, m))) {
      S.blocked = (S.blocked || 0) + 1;
      addLog(`BLOCKED a fake "${m.type}" message — it was not signed by this control room, so phones ignore it too`);
      if (m.type === "alert") toast("A fake alert was blocked — phones will ignore it");
      return;
    }
    handle(m, false);
  }).catch(() => {});
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
["danger", "flows", "alert", "villages", "safe", "teams", "events", "responders", "rescue"].forEach((k) => (S.layers[k] = L.layerGroup()));
const NASA_LAYERS = ["flood", "rain", "soil", "hazard", "truecolor", "radar", "radarimg", "pop", "snow", "landslide"];
map.createPane("dangerPane").style.zIndex = 380;

function nasaLayer(name) {
  if (!S.nasaLayers[name]) {
    const d = S.replay || "latest";
    S.nasaLayers[name] = { flood: () => NASA.floodLayer(d), rain: () => NASA.rainLayer(d), soil: () => NASA.soilLayer(), hazard: () => NASA.hazardLayer(),
      truecolor: () => NASA.trueColorLayer(d), radar: () => NASA.radarWaterLayer(), radarimg: () => NASA.radarImageLayer(), pop: () => NASA.popLayer(),
      snow: () => NASA.snowLayer(), landslide: () => NASA.landslideLayer() }[name]();
  }
  return S.nasaLayers[name];
}
function applyLayers() {
  document.querySelectorAll("#layersBody input[data-layer]").forEach((cb) => {
    const name = cb.dataset.layer;
    const layer = NASA_LAYERS.includes(name) ? nasaLayer(name) : S.layers[name];
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
$("nasaDate").insertAdjacentHTML("beforeend", '<option value="fx:punjab2025">Before-the-flood replay: 24–27 Aug 2025 Punjab floods (forecast a day ahead)</option>');
$("nasaDate").addEventListener("change", (e) => {
  const v = e.target.value;
  if (v.startsWith("fx:")) { startFx(v); return; }
  if (S.fx) stopFx(true);
  setReplay(v === "latest" ? null : v);
});

/* ---- Before-the-flood replay: plays 24-27 Aug 2025 hour by hour, using only the forecast issued ~1 day earlier
   (Open-Meteo Previous Runs API). Automatic mode reacts exactly as it would have then. */
async function startFx() {
  if (S.replay) { S.replay = null; $("replayBanner").hidden = true; }
  let data;
  try { data = await (await fetch("data/replay-2025-08-punjab.json")).json(); }
  catch (e) { toast("Replay data could not be loaded"); $("nasaDate").value = "latest"; return; }
  const peaks = {};
  for (const [id, p] of Object.entries(data.places)) { let k = 0; p.obs.forEach((x, i) => { if (x > p.obs[k]) k = i; }); peaks[id] = k; }
  S.fx = { data, i: 0, playing: true, peaks };
  $("fxSlider").max = data.times.length - 1; $("fxBar").hidden = false; $("fxPlay").textContent = "❚❚ Pause";
  $("replayBanner").hidden = false;
  map.flyToBounds([[30.6, 72.2], [33.3, 75.4]], { duration: 1 });
  addLog(`BEFORE-THE-FLOOD REPLAY: ${data.event}. Watch when Khabardar would have warned, using only forecasts available at each hour.`);
  fxShow(); fxSchedule();
}
function stopFx(quiet) {
  if (!S.fx) return;
  clearTimeout(S.fx.timer);
  S.fx = null; $("fxBar").hidden = true; $("replayBanner").hidden = true;
  if ($("nasaDate").value.startsWith("fx:")) $("nasaDate").value = "latest";
  if (!quiet) addLog("Before-the-flood replay ended — back to live data");
  recompute(); refreshLive();
}
function fxLabel(iso) { return new Date(iso + ":00").toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " PKT"; }
function fxShow() {
  const f = S.fx; if (!f) return;
  $("fxSlider").value = f.i; $("fxTime").textContent = fxLabel(f.data.times[f.i]);
  $("replayBanner").textContent = `BEFORE-THE-FLOOD REPLAY · ${fxLabel(f.data.times[f.i])} — what the forecast issued a day earlier said`;
  recompute();
}
function fxSchedule() {
  const f = S.fx; if (!f) return;
  clearTimeout(f.timer);
  f.timer = setTimeout(() => {
    if (!S.fx) return;
    if (f.playing && !S.pendingAuto) {   // the timeline waits while an automatic alert is counting down
      if (f.i < f.data.times.length - 1) { f.i++; fxShow(); }
      else { f.playing = false; $("fxPlay").textContent = "▶ Play"; addLog("Before-the-flood replay finished (27 Aug 2025 00:00)"); }
    }
    fxSchedule();
  }, +$("fxSpeed").value);
}
function fxWx() {
  const f = S.fx, base = {};
  for (const [id, p] of Object.entries(f.data.places)) base[id] = { rain_24h: p.rain_24h[f.i], rain_max_1h: p.rain_max_1h[f.i] };
  return { ok: true, t: now(), base };
}
$("fxPlay").addEventListener("click", () => { if (!S.fx) return; S.fx.playing = !S.fx.playing; if (S.fx.playing && S.fx.i >= S.fx.data.times.length - 1) S.fx.i = 0; $("fxPlay").textContent = S.fx.playing ? "❚❚ Pause" : "▶ Play"; });
$("fxSlider").addEventListener("input", (e) => { if (S.fx) { S.fx.i = +e.target.value; fxShow(); } });
$("fxStop").addEventListener("click", () => stopFx());
function fxLead(ids) {   // how long before the heaviest rain the alert came
  const f = S.fx; if (!f) return "";
  const parts = ids.filter((id) => f.peaks[id] != null).map((id) => {
    const d = S.live && S.live.villages[id];
    if (d && d.driver === "upstream") return `${VMAP[id].name}: flood water from ${VMAP[d.upstream_from].name} expected in ≈ ${d.upstream_hours} h`;
    const h = f.peaks[id] - f.i;
    return h > 0 ? `${VMAP[id].name} ${h} h before its heaviest rain (${fxLabel(f.data.times[f.peaks[id]])})` : `${VMAP[id].name} as the heavy rain arrived`;
  });
  return parts.length ? " — " + parts.join("; ") : "";
}

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
    L.marker([v.safe.lat, v.safe.lon], { icon }).addTo(S.layers.safe).bindTooltip(v.safe.real
      ? `Suggested safe point for ${v.name}: ${v.safe.name} (${v.safe.kind}${v.safe.gain > 0 ? ", " + v.safe.gain + " m higher than the town" : ""}) — from OpenStreetMap + elevation, to be confirmed by the PDMA`
      : `Safe point (demo placeholder): ${v.safe.name}, ${v.name}`);
  }
  for (const t of RESCUE_TEAMS) {
    const icon = L.divIcon({ className: "", html: `<div class="team-pin ${t.kind}">${t.kind === "boat" ? "≈" : "+"}</div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
    L.marker([t.lat, t.lon], { icon }).addTo(S.layers.teams).bindTooltip(t.real ? `${t.name} — ${t.osmName} (location from OpenStreetMap)` : `${t.name} (demo location)`);
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
  const radar = d.radar_ok ? `${d.radar_water_frac != null ? Math.round(d.radar_water_frac * 100) + "% water" : "–"}${d.radar_new_frac != null ? `, new ${(d.radar_new_frac * 100).toFixed(1)}%` : ""} <span style="color:#777">(seen ${Math.round((d.radar_seen_frac || 0) * 100)}%)</span>` : "–";
  const P = d.parts || {};
  const partsTxt = Object.entries(P).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).map(([k, x]) => `${DRIVER_NAMES[k]} ${x}`).join(" · ") || "all 0";
  return `<b>${esc(v.name)}</b> · ${esc(v.district)}, ${esc(PROVINCE_NAMES[v.province])}<br><span style="color:#666">${esc(v.river)}</span><br>
    <span style="color:#666">Flood types here: ${v.hz.map((h) => HAZARD_NAMES[h]).join(", ")}</span>
    <div class="pop-grid">
      ${d.replay ? "" : `<span>Rain next 24 h</span><b>${num(d.rain_24h, " mm")}</b><span>Heaviest hour</span><b>${num(d.rain_max_1h, " mm")}</b>
      <span>River vs normal (GloFAS)</span><b>${d.river_ratio != null ? d.river_ratio + "×" : "n/a"}</b>
      ${d.river_peak_day ? `<span>River peak in 7 days</span><b>${d.river_peak7_ratio}× on ${esc(d.river_peak_day_label)}</b>` : ""}
      ${v.up ? `<span>Rain in hills upstream</span><b>${num(d.up_rain_24h, " mm")} <span style="color:#777">(${esc(v.up[2])})</span></b>` : ""}
      ${v.heat ? `<span>Hottest day (3 days)</span><b>${num(d.tmax_3d, " °C")} <span style="color:#777">(melt risk above ${v.heat} °C)</span></b>` : ""}
      ${v.hz.includes("coastal") ? `<span>Strongest wind gust</span><b>${num(d.gust_3d, " km/h")}</b>` : ""}
      <span>NASA rain (latest)</span><b>${num(d.nasa_rain_now, " mm/h")}${d.nasa_snow ? " (snow nearby)" : ""}</b>
      <span>NASA soil wetness</span><b>${d.nasa_soil != null ? d.nasa_soil.toFixed(2) + " m³/m³" + (d.wet_factor > 1 ? ` (rain ×${d.wet_factor})` : "") : "–"}</b>
      <span>NASA radar ≤ 6 km</span><b>${radar}</b>`}
      <span>NASA flood water ≤ 6 km</span><b>${sat}</b>
      ${d.upstream_score ? `<span>Flood from upstream</span><b>from ${esc(VMAP[d.upstream_from].name)} in ≈ ${d.upstream_hours} h</b>` : ""}
      <span>Safe point</span><b>${esc(v.safe.name)} <span style="color:#777">${v.safe.real ? `(${esc(v.safe.kind)}${v.safe.gain > 0 ? ", +" + v.safe.gain + " m" : ""}, OpenStreetMap — confirm with PDMA)` : "(demo placeholder)"}</span></b>
      <span>People within 6 km</span><b>${d.pop_capped ? "at least " : ""}${fmtPeople(d.pop_6km)}${d.people_water ? ` · under water ≈ ${fmtPeople(d.people_water)}` : ""}</b>
    </div>
    <span style="color:#666">Scores: ${esc(partsTxt)}</span><br>
    Risk: <b>${d.score ?? "–"}</b> <span class="lvl ${d.level || "normal"}">${(d.level || "normal").toUpperCase()}</span> <span style="color:#666">by ${esc(DRIVER_NAMES[d.driver] || "–")}</span>${d.test ? '<span class="test">TEST</span>' : ""}${d.replay ? '<span class="rpl">REPLAY</span>' : ""}<br>
    ${d.score ? `<i style="color:#444">${esc(reasonText(reasonOf(d), "en"))}</i><br>` : ""}
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
  const n = Object.values(S.phones).filter((p) => !p.sms && !p.report && phoneMatches(p, { villages: [...S.selected], center: S.mode === "zone" ? S.zoneCenter : null, radius_km: S.radiusKm })).length;
  $("preview").innerHTML = `<b>${esc(t.en.title)}</b> — ${esc(t.en.body)}<div class="ur"><b>${esc(t.ur.title)}</b> — ${esc(t.ur.body)}</div>
    <div class="muted small">Keypad phones get an SMS: “${esc(smsText(level, VMAP[id], $("isTest").checked))}”</div>
    <div class="muted small">Will reach <b>${n}</b> phone(s) now · each in its chosen language (Urdu or English) with a siren and voice.</div>`;
}

function phoneMatches(p, alert) {
  for (const vid of p.villages || []) if (alert.villages.includes(vid)) return vid;
  if (alert.center && alert.radius_km && p.lat != null && !p.family && haversineKm(alert.center[0], alert.center[1], p.lat, p.lon) <= alert.radius_km) return nearestVillage(p.lat, p.lon).id;
  return null;
}

/* One way to send an alert, used by the SEND button and by automatic mode. */
async function sendAlert({ villages, level, center = null, radius_km = null, test, auto = false }) {
  const reasons = {};
  for (const id of villages) { const r = reasonOf(S.live && S.live.villages[id]); if (r) reasons[id] = r; }
  const fromTestData = villages.some((id) => S.live && (S.live.villages[id].test || S.live.villages[id].replay));
  const alert = { type: "alert", id: Math.random().toString(36).slice(2, 10), level, villages, center, radius_km,
                  test: test || fromTestData, auto, reasons, t: now() };
  $("sendBtn").disabled = true; $("sendResult").textContent = auto ? "Sending automatic alert…" : "Sending…";
  const ok = await publish(S.room, alert);
  setTimeout(() => ($("sendBtn").disabled = false), 800);
  if (!ok) { $("sendResult").textContent = "Could not reach the relay — check the connection and press SEND again."; toast("Alert NOT sent — the relay is not reachable"); return false; }
  handle(alert, true);
  zoomToAlert(alert);
  setTab("wall");
  return true;
}
$("sendBtn").addEventListener("click", () => {
  const villages = [...S.selected];
  if (!villages.length) { $("sendResult").textContent = "Choose at least one place or draw a zone."; toast("First choose a place on the map (or draw a zone), then press SEND ALERT"); return; }
  sendAlert({ villages, level: $("level").value, center: S.mode === "zone" ? S.zoneCenter : null, radius_km: S.mode === "zone" ? S.radiusKm : null, test: $("isTest").checked });
});

// ---------------------------------------------------------------- automatic mode
const LEVEL_RANK = { normal: 0, watch: 1, warning: 2, evacuate: 3 };
const LEVEL_BY_RANK = ["normal", "watch", "warning", "evacuate"];
const AUTO_COOLDOWN = 6 * 3600;   // a place is not alerted again at the same level for 6 hours (it can still escalate)
function autoKey() { return "kh_auto_" + S.room; }
function loadAuto() {
  let a = {};
  try { a = JSON.parse(localStorage.getItem(autoKey()) || "{}"); } catch (e) { /* ignore */ }
  S.auto = Object.assign({ alerts: true, rescue: true, threshold: "warning", delay: 10 }, a);
  $("autoAlerts").checked = S.auto.alerts; $("autoRescue").checked = S.auto.rescue;
  $("autoLevel").value = S.auto.threshold; $("autoDelay").value = String(S.auto.delay);
}
function saveAuto() {
  S.auto = { alerts: $("autoAlerts").checked, rescue: $("autoRescue").checked, threshold: $("autoLevel").value, delay: +$("autoDelay").value };
  localStorage.setItem(autoKey(), JSON.stringify(S.auto));
  if (!S.auto.alerts) cancelAuto(false);
  addLog(`Automatic mode: alerts ${S.auto.alerts ? "ON at " + S.auto.threshold.toUpperCase() + "+" : "OFF"}, rescue dispatch ${S.auto.rescue ? "ON" : "OFF"}`);
  renderAutoStatus(); autoCheck(); scheduleRender();
}
["autoAlerts", "autoRescue", "autoLevel", "autoDelay"].forEach((id) => $(id).addEventListener("change", saveAuto));

function lastClear(vid) { return Math.max(0, ...S.clears.filter((c) => c.villages.includes(vid)).map((c) => c.t || 0)); }
function alertedLevel(vid) {   // highest level already sent to this place recently (manual or automatic), since its last all-clear
  let best = 0;
  const t0 = Math.max(now() - AUTO_COOLDOWN, lastClear(vid));
  for (const a of S.alerts) if ((a.t || 0) > t0 && a.villages.includes(vid)) best = Math.max(best, LEVEL_RANK[a.level] || 0);
  const c = S.autoCancelled[vid];
  if (c && now() - c.t < 3600) best = Math.max(best, c.rank);   // an officer cancelled: wait an hour unless it gets worse
  return best;
}
function autoDue() {
  if (!S.live) return [];
  const th = LEVEL_RANK[S.auto.threshold];
  return VILLAGES.filter((v) => { const r = LEVEL_RANK[S.live.villages[v.id].level]; return r >= th && r > alertedLevel(v.id); });
}
/* "All clear": tell phones the danger has passed (manual button, or automatically when an alerted place is Normal again). */
async function sendAllClear(villages, auto) {
  const msg = { type: "allclear", id: Math.random().toString(36).slice(2, 10), villages, auto: !!auto, test: $("isTest").checked, t: now() };
  const ok = await publish(S.room, msg);
  if (!ok) { toast("All clear NOT sent — the relay is not reachable"); return false; }
  handle(msg, true);
  toast(`${auto ? "Automatic " : ""}ALL CLEAR sent for ${villages.map((id) => VMAP[id].name).join(", ")}`);
  return true;
}
$("clearBtn").addEventListener("click", () => {
  const vs = [...S.selected];
  if (!vs.length) { toast("Select the places where the danger has passed, then press Send ALL CLEAR"); return; }
  sendAllClear(vs, false);
});
function autoAllClear() {
  if (!S.auto || !S.auto.alerts || !S.historyReady || S.pendingAuto || !S.live || S._clearing) return false;
  const t = now();
  const done = VILLAGES.filter((v) => {
    if (S.live.villages[v.id].level !== "normal" || alertedLevel(v.id) === 0) return false;
    const last = Math.max(...S.alerts.filter((a) => a.villages.includes(v.id)).map((a) => a.t || 0));
    return t - last > 60;   // wait a minute, so a short dip does not end the warning
  }).map((v) => v.id);
  if (!done.length) return false;
  S._clearing = true;
  sendAllClear(done, true).finally(() => { S._clearing = false; });
  return true;
}
$("fakeBtn").addEventListener("click", async () => {
  const vs = S.selected.size ? [...S.selected] : ["mingora"];
  const fake = { type: "alert", id: "fake" + Math.random().toString(36).slice(2, 8), level: "evacuate", villages: vs, test: true, t: now() };
  addLog(`FAKE-ALERT TEST: sending an UNSIGNED evacuate alert for ${vs.map((id) => VMAP[id].name).join(", ")}, like an attacker would…`);
  const res = await publish(S.room, fake, { noSign: true, untrusted: CFG.edition === "local" });
  if (res === "blocked") { addLog("FAKE-ALERT TEST: the laptop refused it — only the control room on this laptop may send alerts"); toast("Fake alert blocked by the laptop"); }
  else if (!res) toast("Relay not reachable");
});

function autoCheck() {
  renderAutoStatus();
  if (!S.auto || !S.auto.alerts || !S.historyReady || S.pendingAuto || !S.live) return;
  if (autoAllClear()) return;
  const due = autoDue();
  if (!due.length) return;
  const top = Math.max(...due.map((v) => LEVEL_RANK[S.live.villages[v.id].level]));
  const villages = due.filter((v) => LEVEL_RANK[S.live.villages[v.id].level] === top).map((v) => v.id);
  // a little random extra wait, so two control rooms in automatic mode do not both send the same alert
  const delay = S.fx ? Math.min(S.auto.delay, 3) : S.auto.delay;   // short countdown during a replay (the timeline waits)
  S.pendingAuto = { level: LEVEL_BY_RANK[top], villages, due: now() + delay + Math.random() * 2 };
  addLog(`AUTOMATIC: ${LEVEL_BY_RANK[top].toUpperCase()} detected for ${villages.map((id) => VMAP[id].name).join(", ")} — alert in ${S.auto.delay} s unless cancelled`);
  renderPending();
  if (S.auto.delay > 0) toast(`Automatic ${LEVEL_BY_RANK[top]} alert in ${S.auto.delay} s — ${villages.length} place(s). Cancel in panel 1 if needed.`, 5000);
}
async function fireAuto() {
  const p = S.pendingAuto; if (!p) return;
  S.pendingAuto = null; renderPending();
  const villages = p.villages.filter((id) => LEVEL_RANK[p.level] > alertedLevel(id));   // another room may have sent it already
  if (!villages.length) { addLog("AUTOMATIC: alert already sent by another control room — skipped"); autoCheck(); return; }
  const ok = await sendAlert({ villages, level: p.level, test: $("isTest").checked, auto: true });
  if (ok) toast(`Automatic ${p.level.toUpperCase()} alert sent to ${villages.length} place(s)`);
  setTimeout(autoCheck, 500);   // places at a lower level get their own alert next
}
function cancelAuto(byOfficer) {
  const p = S.pendingAuto; if (!p) return;
  S.pendingAuto = null;
  if (byOfficer) {
    for (const id of p.villages) S.autoCancelled[id] = { rank: LEVEL_RANK[p.level], t: now() };
    addLog(`AUTOMATIC alert cancelled by the officer (${p.villages.map((id) => VMAP[id].name).join(", ")}) — paused for 1 hour unless the risk gets worse`);
    toast("Automatic alert cancelled");
  }
  renderPending(); renderAutoStatus();
}
$("autoSendNow").addEventListener("click", () => { if (S.pendingAuto) { S.pendingAuto.due = 0; fireAuto(); } });
$("autoCancel").addEventListener("click", () => cancelAuto(true));
function renderPending() {
  const p = S.pendingAuto, box = $("autoPending");
  if (!p) { box.hidden = true; return; }
  box.hidden = false;
  box.className = "auto-pending " + p.level;
  const left = Math.max(0, Math.ceil(p.due - now()));
  const why = p.villages.slice(0, 4).map((id) => `${VMAP[id].name}: ${reasonText(reasonOf(S.live.villages[id]), "en")}`).join(" · ");
  $("autoPendingText").innerHTML = `AUTOMATIC ${esc(p.level.toUpperCase())} ALERT in <b>${left} s</b> → ${esc(p.villages.map((id) => VMAP[id].name).join(", "))}<div class="small" style="font-weight:400">${esc(why)}${p.villages.length > 4 ? " …" : ""}</div>`;
}
function renderAutoStatus() {
  if (!S.auto) return;
  const on = S.auto.alerts || S.auto.rescue;
  $("autoPill").textContent = on ? "ON" : "OFF"; $("autoPill").className = "pill" + (on ? "" : " off");
  if (!S.auto.alerts) { $("autoStatus").textContent = "Automatic alerts are OFF — send alerts with the manual controls below."; return; }
  if (!S.historyReady) { $("autoStatus").textContent = "Connecting to the relay…"; return; }
  const n = S.live ? VILLAGES.filter((v) => LEVEL_RANK[S.live.villages[v.id].level] >= LEVEL_RANK[S.auto.threshold]).length : 0;
  $("autoStatus").textContent = `Watching ${VILLAGES.length} places${S.replay ? " (NASA replay)" : ""} · checked ${fmtTime(now())} · ${n} at ${S.auto.threshold} or higher` +
    (n && !autoDue().length ? " — all already alerted (or cancelled by an officer)" : "");
}
setInterval(() => {
  if (S.pendingAuto) { if (now() >= S.pendingAuto.due) fireAuto(); else renderPending(); }
  if (Rescue.autoTick()) Rescue.render();
}, 1000);
setInterval(autoCheck, 30000);
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
      S.resetAt = t; S.responses = {}; S.alerts = []; S.clears = []; S.currentAlert = null; S.scenario = {};
      if (S.fx) stopFx();
      S.pendingAuto = null; S.autoCancelled = {}; renderPending();
      for (const id of Object.keys(S.phones)) if (S.phones[id].sim || S.phones[id].sms || S.phones[id].report) delete S.phones[id];
      $("log").innerHTML = ""; $("sendResult").textContent = ""; drawAlertArea(null);
      if (S.replay) { $("nasaDate").value = "latest"; setReplay(null); }   // a reset also ends a NASA replay
      recompute();
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
      if (p.sms || p.report) continue;
      const vid = phoneMatches(p, m);
      if (!vid) continue;
      n++; if (p.device === "keypad") sms++;
      S.responses[m.id + "|" + p.id] = { alert_id: m.id, phone_id: p.id, village_id: vid, status: "sent", t_sent: t, lat: null, lon: null };
      if (p.dummy || p.sim) Dummies.simulate(m, p);
    }
    drawAlertArea(m);
    $("sendResult").textContent = `${m.auto ? "Automatic alert sent" : "Sent"} to ${n} phone(s) at ${fmtTime(m.t || t)}${sms ? ` · ${sms} by SMS` : ""}.`;
    addLog(`${m.auto ? "AUTOMATIC " : ""}${m.level.toUpperCase()} sent to ${n} phone(s) — ${m.villages.map((v) => VMAP[v].name).join(", ")}${m.test ? " [DEMO]" : ""}${S.fx ? " · replay time " + fxLabel(S.fx.data.times[S.fx.i]) + fxLead(m.villages) : ""}`);
    if (S.pendingAuto) renderPending();
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
  } else if (m.type === "allclear") {
    if (S.clears.some((c) => c.id === m.id)) return;
    m.villages = (m.villages || []).filter((id) => VMAP[id]);
    S.clears.push(m);
    addLog(`${m.auto ? "AUTOMATIC " : ""}ALL CLEAR for ${m.villages.map((id) => VMAP[id].name).join(", ")} — phones there are told the danger has passed`);
  } else if (m.type === "sms_in") {
    handleSms(m, t);
  } else if (m.type === "report") {
    handleReport(m, t);
  } else if (m.type === "rescue") {
    if (!local) Rescue.applyRemote(m);
  } else if (m.type === "scenario") {
    m.on ? (S.scenario[m.village] = true) : delete S.scenario[m.village];
    recompute();
  }
  scheduleRender();
}
/* ---- Help from people WITHOUT the app ---------------------------------------------------------------------------
   1. SMS help line: "MADAD Dadu 5 zakhmi" (help, place, people, needs) from any phone, even a keypad phone with no internet.
   2. Reports: someone with the app reports other people who need help. */
function parseSms(text) {
  const raw = String(text || "");
  const s = " " + raw.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ") + " ";
  const tok = s.trim().split(" ");
  const has = (...ws) => ws.some((w) => s.includes(" " + w + " "));
  const out = { status: null, village: null, people: null, injured: false, water: false, elderly: false, children: false, pregnant: false };
  if (has("madad", "help", "bachao", "bachaao", "sos", "مدد", "بچاؤ", "بچاو") || tok[0] === "2") out.status = "help";
  else if (has("mehfooz", "mahfooz", "mehfuz", "safe", "theek", "thik", "محفوظ", "ٹھیک") || tok[0] === "1") out.status = "safe";
  let best = null, bl = 0;
  for (const v of VILLAGES) {
    const names = [v.id, v.name.toLowerCase().replace(/\(.*?\)/g, "").trim(), v.district.toLowerCase(), (v.name_ur || "").replace(/\(.*?\)/g, "").trim()].filter((x) => x && x.length > 2);
    for (const n of names) if (s.includes(" " + n + " ") && n.length > bl) { best = v.id; bl = n.length; }
  }
  out.village = best;
  const nums = tok.filter((x) => /^\d{1,3}$/.test(x)).map(Number);
  if (nums.length && (tok[0] === "1" || tok[0] === "2")) nums.shift();
  if (nums.length) out.people = Math.min(200, Math.max(1, nums[0]));
  out.injured = has("zakhmi", "zakhmee", "injured", "زخمی");
  out.water = has("pani", "paani", "water", "doob", "پانی");
  out.elderly = has("buzurg", "elderly", "budha", "boorha", "بزرگ", "mazoor", "معذور");
  out.children = has("bachay", "bachey", "bache", "children", "bachon", "بچے");
  out.pregnant = has("hamla", "hamila", "pregnant", "حاملہ");
  return out;
}
function addOutsideRequest({ key, pid, name, village, lat, lon, details, source, note, notify, t, flag }) {
  S.phones[pid] = Object.assign(S.phones[pid] || {}, { id: pid, name, villages: village ? [village] : [], lang: "ur", device: source === "sms" ? "keypad" : "report", joined: t, [flag]: true });
  const r = S.responses[key] || (S.responses[key] = { alert_id: key.split("|")[0], phone_id: pid, status: "help", t_sent: t, t_help: t, rescue: { status: "waiting" } });
  Object.assign(r, { village_id: village, details, source, note, notify, lat: lat ?? r.lat ?? null, lon: lon ?? r.lon ?? null, gps: lat != null });
  return r;
}
function handleSms(m, t) {
  const p = parseSms(m.text);
  const pid = "sms_" + hashStr(m.from || m.text).toString(36);
  const who = "SMS " + (m.from || "unknown number");
  if (p.status === "safe") {   // a keypad phone replying "1" to an alert SMS
    const open = Object.entries(S.responses).filter(([, r]) => r.phone_id === pid);
    open.forEach(([, r]) => { r.status = "safe"; });
    addLog(`SMS from ${m.from || "unknown"}: “${m.text}” → marked SAFE`);
    return;
  }
  const key = "sms:" + hashStr(pid + Math.floor(t / 600)) + "|" + pid;   // one request per number per 10 minutes
  addOutsideRequest({ key, pid, name: who, village: p.village, details: { people: p.people || 1, injured: p.injured, water: p.water, elderly: p.elderly, children: p.children, pregnant: p.pregnant },
    source: "sms", note: m.text, t, flag: "sms" });
  addLog(`SMS HELP from ${m.from || "unknown"}: “${m.text}” → ${p.village ? VMAP[p.village].name : "place not understood"}, ${p.people || 1} people${p.injured ? ", injured" : ""}${p.water ? ", water rising" : ""}`);
  toast(`Help request by SMS${p.village ? " from " + VMAP[p.village].name : ""} added to the rescue queue`);
}
function handleReport(m, t) {
  if (!m.rid || !VMAP[m.village]) return;
  const reporter = S.phones[m.pid];
  const key = "report:" + m.rid + "|rep_" + m.rid;
  addOutsideRequest({ key, pid: "rep_" + m.rid, name: `Reported by ${(reporter && reporter.name) || m.name || "a phone"}`, village: m.village, lat: m.lat, lon: m.lon,
    details: { people: +m.people || 1, injured: !!m.injured, water: !!m.water, elderly: !!m.elderly, children: !!m.children, pregnant: !!m.pregnant },
    source: "report", note: m.note, notify: m.pid, t, flag: "report" });
  addLog(`REPORT: ${(reporter && reporter.name) || "a phone"} reports ${+m.people || 1} people needing help in ${VMAP[m.village].name}${m.note ? ` — “${m.note}”` : ""}`);
}
$("smsSend").addEventListener("click", async () => {
  const text = $("smsText").value.trim();
  if (!text) { toast("Type an SMS first, e.g. MADAD Dadu 5 zakhmi"); return; }
  const num = $("smsFrom").value.replace(/[^\d+]/g, "");
  const masked = num.length > 6 ? num.slice(0, 5) + "*****" + num.slice(-2) : num || "unknown number";
  const ok = await publish(S.room, { type: "sms_in", from: masked, text });
  if (ok) { $("smsText").value = ""; } else toast("Could not reach the relay");
});

/* People who were warned but did not answer within a few minutes, in a place at Warning or Evacuate:
   they may be asleep, without battery, or trapped — the rescue list gets a "check on them" entry. */
const NO_ANSWER_MIN = 2;   // demo value; a real deployment might wait 15–30 minutes
function checkNoAnswer() {
  const t = now();
  let changed = false;
  for (const r of Object.values(S.responses)) {
    if (r.welfare || RANK[r.status] >= 3 || r.source) continue;
    const a = S.alerts.find((x) => x.id === r.alert_id);
    if (!a || !["warning", "evacuate"].includes(a.level) || t - (a.t || t) > 6 * 3600) continue;
    const p = S.phones[r.phone_id] || {};
    if (p.family || t - (r.t_sent || t) < NO_ANSWER_MIN * 60) continue;
    r.welfare = true; r.t_help = t; r.details = { people: 1, noanswer: true, level: a.level }; r.rescue = r.rescue || { status: "waiting" };
    addLog(`NO ANSWER: ${phoneName(p, r.phone_id)} (${VMAP[r.village_id].name}) has not replied ${NO_ANSWER_MIN} min after the ${a.level} alert — added to the rescue list for a check`);
    changed = true;
  }
  if (changed) scheduleRender();
}
setInterval(checkNoAnswer, 5000);

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
  const rs = currentResponses(), all = Object.values(S.phones).filter((p) => !p.sms && !p.report);
  const real = all.filter(isRealPhone).length, dummy = all.filter((p) => p.dummy).length, sim = all.filter((p) => p.sim).length;
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
  return Object.values(S.phones).filter((p) => !p.sms && !p.report).sort((a, b) => k(a) - k(b) || (b.joined || 0) - (a.joined || 0) || String(a.name).localeCompare(String(b.name)));
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
      <b>${esc(rtl ? v.name_ur : v.name)}</b><p>${esc(tx.body)}</p>
      ${a.reasons && a.reasons[r.village_id] ? `<p class="small">${esc(reasonText(a.reasons[r.village_id], p.lang))}</p>` : ""}<div class="pm-safe">→ ${esc(safe)}</div>
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
  if (S.fx) return;
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
  if (!S.replay) {   // radar takes longer (several days of passes): add it when ready
    S.radarStatus = "loading"; renderBadges();
    const rad = await NASA.sampleRadar(VILLAGES).catch(() => null);
    if (S.replay) return;
    S.radar = rad; S.radarStatus = rad && Object.keys(rad).length ? "ok" : "bad";
    recompute();
    const fresh = rad ? VILLAGES.filter((v) => (rad[v.id] || {}).radar_new_px >= 4 && rad[v.id].radar_new_frac >= 0.03) : [];
    if (S.radarStatus === "ok") addLog(`NASA radar (Sentinel-1, last 3 days vs 6 weeks ago) checked ${Object.keys(rad).length} places — new water near ${fresh.length}${fresh.length ? ": " + fresh.map((v) => v.name).join(", ") : ""}`);
  }
}
function recompute() {
  if (S.fx) {   // before-the-flood replay: forecast of that hour only
    S.live = liveView({ wx: fxWx(), nasa: null, radar: null, scenario: {}, replay: false });
    for (const d of Object.values(S.live.villages)) d.replay = true;
  } else S.live = liveView({ wx: S.wx, nasa: S.nasa, radar: S.replay ? null : S.radar, scenario: S.scenario, replay: S.replay });
  renderBadges(); renderRiskTable(); drawVillages(); drawDanger(); drawFlows(); renderImpact(); renderPreview();
  autoCheck();
}
/* Where the flood goes next: animated lines along the river paths from each place in danger, with arrival times. */
function drawFlows() {
  S.layers.flows.clearLayers();
  if (!S.live) return;
  // places reached from each source; every river link between two of them is drawn
  const reached = {};
  for (const f of S.live.flows) (reached[f.from] = reached[f.from] || new Set([f.from])).add(f.to);
  const edges = new Map();
  for (const set of Object.values(reached)) {
    for (const [a, b, , river] of RIVER_LINKS) {
      if (!set.has(a) || !set.has(b)) continue;
      const lvl = (S.live.villages[b] || {}).upstream_score >= 55 ? "warning" : "watch";
      const k = a + ">" + b;
      if (!edges.has(k) || lvl === "warning") edges.set(k, { a, b, river, lvl });
    }
  }
  for (const { a, b, river, lvl } of edges.values()) {
    const A = VMAP[a], B = VMAP[b];
    L.polyline([[A.lat, A.lon], [B.lat, B.lon]], { color: LEVEL_COLOR[lvl], weight: 4, opacity: 0.9, className: "flowline" })
      .bindTooltip(`${river}: flood water moving from ${A.name} towards ${B.name}`).addTo(S.layers.flows);
  }
  // arrival-time labels: the soonest arrival at each place
  for (const [id, d] of Object.entries(S.live.villages)) {
    if (!d.upstream_score) continue;
    const v = VMAP[id], lvl = d.upstream_score >= 55 ? "warning" : "watch";
    const icon = L.divIcon({ className: "", html: `<div class="eta ${lvl}">≈ ${d.upstream_hours} h</div>`, iconSize: [46, 16], iconAnchor: [-8, 22] });
    L.marker([v.lat, v.lon], { icon }).bindTooltip(`Flood water from ${VMAP[d.upstream_from].name} expected at ${v.name} in about ${d.upstream_hours} hours (rough estimate, ${esc(d.upstream_river)})`).addTo(S.layers.flows);
  }
}
function fmtPeople(n) { return n == null ? "–" : n >= 1e6 ? (n / 1e6).toFixed(1) + " million" : n >= 1000 ? Math.round(n / 1000) + ",000" : String(n); }
function renderImpact() {
  if (!S.live) return;
  const vs = Object.entries(S.live.villages);
  const zone = vs.filter(([, d]) => d.level === "warning" || d.level === "evacuate").reduce((a, [, d]) => a + (d.people_zone || 0), 0);
  const water = vs.reduce((a, [, d]) => a + (d.people_water || 0), 0);
  const top = vs.filter(([, d]) => d.people_water > 0).sort((a, b) => b[1].people_water - a[1].people_water).slice(0, 4);
  const moving = new Set(S.live.flows.map((f) => f.to)).size;
  $("impactLine").innerHTML = `People living in danger zones (Warning+): <b>${fmtPeople(zone)}</b> · living under flood water seen by NASA: <b>${fmtPeople(water)}</b>` +
    (top.length ? ` (${top.map(([id, d]) => `${esc(VMAP[id].name)} ${fmtPeople(d.people_water)}`).join(", ")})` : "") +
    ` · places the flood may reach next: <b>${moving}</b><div class="muted small">Estimates from NASA SEDAC population (2020) and NASA flood maps; arrival times are rough.</div>`;
}
function renderBadges() {
  const b = $("srcBadge"), n = $("nasaBadge");
  if (S.fx) { b.textContent = "FORECAST REPLAY · 24–27 Aug 2025"; b.className = "badge replay"; n.textContent = "NASA: not used in this replay"; n.className = "badge"; return; }
  if (S.replay) { b.textContent = "Weather: paused during replay"; b.className = "badge off"; }
  else if (S.wx && S.wx.ok) { b.textContent = `LIVE rain & river · ${fmtTime(S.wx.t)}${S.wx.stale ? " (cached)" : ""}`; b.className = "badge live"; }
  else { b.textContent = S.wx ? "Weather data offline" : "Weather…"; b.className = "badge off"; }
  if (S.nasaStatus === "loading") { n.textContent = "NASA satellite: loading…"; n.className = "badge"; }
  else if (S.nasaStatus === "ok") { n.textContent = S.replay ? `NASA REPLAY · ${S.replay}` : `NASA satellite · live${S.radarStatus === "loading" ? " · radar loading…" : S.radarStatus === "ok" ? " · radar ✓" : ""}`; n.className = "badge " + (S.replay ? "replay" : "live"); }
  else { n.textContent = "NASA data unavailable"; n.className = "badge off"; }
}
function satCell(d) {
  if (!d.nasa_ok) return '<span class="muted">–</span>';
  if ((d.nasa_flood_px || 0) >= 3 && d.nasa_flood_frac >= 0.01) return `<span class="satv flood">flood water ${(d.nasa_flood_frac * 100).toFixed(0)}%</span>`;
  if ((d.radar_new_px || 0) >= 4 && d.radar_new_frac >= 0.03) return `<span class="satv flood">radar: new water ${(d.radar_new_frac * 100).toFixed(0)}%</span>`;
  if (d.nasa_cloud_frac > 0.6 && !d.radar_ok) return '<span class="satv cloud">cloudy / no view</span>';
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
      <td><span class="lvl ${d.level}">${d.score} ${d.level.toUpperCase()}</span>${d.test ? '<span class="test">TEST</span>' : ""}${d.replay ? '<span class="rpl">REPLAY</span>' : ""}<div class="sub">${d.score > 0 ? "by " + esc(DRIVER_NAMES[d.driver] || d.driver) + (d.driver === "upstream" ? ` (≈ ${d.upstream_hours} h)` : "") : ""}</div></td></tr>`;
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

(async function init() {
  setupRoom();
  await loadKeys();
  renderJoin();
  $("signState").textContent = S.pubKey ? "Alerts are digitally signed ✓" : "Signing not available in this browser";
  drawStatic();
  applyLayers();
  map.invalidateSize();
  map.fitBounds([[24.0, 61.5], [37.0, 77.5]]);
  setTimeout(() => { map.invalidateSize(); map.fitBounds([[24.0, 61.5], [37.0, 77.5]]); }, 300);
  window.addEventListener("resize", () => map.invalidateSize());
  Dummies.init();
  drawVillages(); renderSelection(); renderAll();
  loadAuto(); renderAutoStatus();
  subscribe(S.room, "12h", receive, (st) => {
    $("relayBadge").textContent = st === "ok" ? (CFG.edition === "local" ? "Local relay connected" : "Relay connected") : "Relay reconnecting…";
    $("relayBadge").className = "badge " + (st === "ok" ? "live" : "off");
    // let the room's history arrive before automatic mode decides anything (so nothing is sent twice after a reload)
    if (st === "ok" && !S.historyReady && !S._historyTimer) S._historyTimer = setTimeout(() => { S.historyReady = true; autoCheck(); }, 2500);
  });
  refreshLive();
  drawEvents();
  if ("serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
