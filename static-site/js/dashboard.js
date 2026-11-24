/* Khabardar static edition — control room. State is rebuilt from the relay messages of this room. */
const S = {
  room: null, live: null, cache: null, scenario: {}, phones: {}, responses: {}, alerts: [], resetAt: 0,
  selected: new Set(), mode: "villages", zoneCenter: null, radiusKm: 20, currentAlert: null,
  markers: {}, responderMarkers: {}, zoneCircle: null
};
const LEVEL_COLOR = { normal: "#2bb673", watch: "#f5c542", warning: "#f28c28", evacuate: "#e5383b" };
const STATUS_COLOR = { sent: "#c9d6e5", delivered: "#7fc8ff", played: "#f5c542", safe: "#2bb673", help: "#e5383b" };
const STATUS_TEXT = { sent: "Sent", delivered: "Delivered", played: "Siren played", safe: "SAFE", help: "NEEDS HELP" };
const RANK = { sent: 0, delivered: 1, played: 2, safe: 3, help: 3 };
const $ = (id) => document.getElementById(id);
const esc = escHtml;
function hash(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

// ---------------------------------------------------------------- room
function setupRoom() {
  const urlRoom = new URLSearchParams(location.search).get("room");
  S.room = (urlRoom || localStorage.getItem("khabardar_room") || newRoomCode()).toLowerCase().replace(/[^a-z0-9]/g, "");
  localStorage.setItem("khabardar_room", S.room);
  $("roomCode").textContent = S.room.slice(0, 4).toUpperCase();
  const base = location.href.split("?")[0].replace(/dashboard\.html$/, "").replace(/\/$/, "") + "/phone.html";
  const url = `${base}?room=${S.room}`;
  $("joinUrl").textContent = url;
  $("qr").innerHTML = "";
  if (window.QRCode) new QRCode($("qr"), { text: url, width: 84, height: 84, correctLevel: QRCode.CorrectLevel.M });
}
$("newRoomBtn").addEventListener("click", () => {
  if (!confirm("Start a new room? Phones must scan the new QR code.")) return;
  localStorage.setItem("khabardar_room", newRoomCode());
  location.href = location.href.split("?")[0];
});

// ---------------------------------------------------------------- map
const map = L.map("map").setView([31.5, 71.5], 6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap contributors" }).addTo(map);

function villageLevel(id) { return S.live?.villages?.[id]?.level || "normal"; }
function drawVillages() {
  for (const v of VILLAGES) {
    const sel = S.selected.has(v.id);
    const style = { radius: sel ? 13 : 10, color: sel ? "#ffffff" : "#0b1726", weight: sel ? 4 : 2, fillColor: LEVEL_COLOR[villageLevel(v.id)], fillOpacity: 0.95 };
    if (!S.markers[v.id]) {
      const m = L.circleMarker([v.lat, v.lon], style).addTo(map);
      m.bindTooltip(v.name, { permanent: true, direction: "right", offset: [10, 0] });
      m.on("click", () => onVillageClick(v.id));
      S.markers[v.id] = m;
      const icon = L.divIcon({ className: "", html: '<div style="width:10px;height:10px;background:#7fe0ff;border:2px solid #0b1726"></div>', iconSize: [10, 10] });
      L.marker([v.safe.lat, v.safe.lon], { icon }).addTo(map).bindTooltip("Safe point (demo): " + v.safe.name);
    } else S.markers[v.id].setStyle(style);
    S.markers[v.id].bindPopup(popupHtml(v));
  }
}
function popupHtml(v) {
  const d = S.live?.villages?.[v.id] || {};
  return `<b>${esc(v.name)}</b> (${esc(v.district)})<br>Rain next 24h: <b>${d.rain_24h ?? "–"} mm</b> · max 1h: <b>${d.rain_max_1h ?? "–"} mm</b><br>
    River peak vs normal: <b>${d.river_ratio != null ? d.river_ratio + "×" : "n/a"}</b><br>
    Risk: <b>${d.score ?? "–"}</b> — <span class="lvl ${d.level || "normal"}">${(d.level || "normal").toUpperCase()}</span>${d.test ? '<span class="test">TEST</span>' : ""}<br>
    <button class="mini" onclick="toggleScenario('${v.id}', ${!d.test})">${d.test ? "Turn TEST scenario off" : "Simulate heavy rain (TEST)"}</button>`;
}
function onVillageClick(id) {
  if (S.mode !== "villages") return;
  S.selected.has(id) ? S.selected.delete(id) : S.selected.add(id);
  drawVillages(); renderSelection();
}
map.on("click", (e) => { if (S.mode === "zone") { S.zoneCenter = [e.latlng.lat, e.latlng.lng]; drawZone(); } });
function drawZone() {
  if (S.zoneCircle) { map.removeLayer(S.zoneCircle); S.zoneCircle = null; }
  if (S.mode === "zone" && S.zoneCenter) {
    S.zoneCircle = L.circle(S.zoneCenter, { radius: S.radiusKm * 1000, color: "#f05a28", weight: 2, fillOpacity: 0.12 }).addTo(map);
    S.selected = new Set(VILLAGES.filter((v) => haversineKm(S.zoneCenter[0], S.zoneCenter[1], v.lat, v.lon) <= S.radiusKm).map((v) => v.id));
  }
  drawVillages(); renderSelection();
}
window.toggleScenario = async (id, on) => {
  on ? (S.scenario[id] = true) : delete S.scenario[id];
  publish(S.room, { type: "scenario", village: id, on });
  addLog(`TEST heavy-rain scenario ${on ? "ON" : "OFF"} for ${VMAP[id].name} (simulated values)`);
  refreshLive(); map.closePopup();
};

// ---------------------------------------------------------------- composer
document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener("change", (e) => {
  S.mode = e.target.value; $("zoneRow").hidden = S.mode !== "zone";
  $("mapHint").textContent = S.mode === "zone" ? "Click the map to place the danger zone" : "Click villages to select them · or switch to “Draw zone” and click the map";
  if (S.mode === "villages") S.zoneCenter = null;
  S.selected.clear(); drawZone();
}));
$("radius").addEventListener("input", (e) => { S.radiusKm = +e.target.value; $("radiusVal").textContent = S.radiusKm; drawZone(); });
$("level").addEventListener("change", renderPreview);
function renderSelection() {
  const ids = [...S.selected];
  $("selChips").innerHTML = ids.length ? ids.map((id) => `<span class="chip">${esc(VMAP[id].name)}</span>`).join("")
    : `<span class="muted">${S.mode === "zone" ? "Click the map to draw a zone" : "No village selected"}</span>`;
  renderPreview();
}
function renderPreview() {
  const id = [...S.selected][0];
  if (!id) { $("preview").innerHTML = '<span class="muted">Message preview appears here.</span>'; return; }
  const t = buildTexts($("level").value, VMAP[id]);
  $("preview").innerHTML = `<b>${esc(t.en.title)}</b> — ${esc(t.en.body)}<div class="ur"><b>${esc(t.ur.title)}</b> — ${esc(t.ur.body)}</div>
    <div class="muted small">Each phone gets this in its own language (Urdu, Pashto, Sindhi or English), with a siren and a voice message.</div>`;
}

function phoneMatches(p, alert) {
  for (const vid of p.villages || []) if (alert.villages.includes(vid)) return vid;
  if (alert.center && alert.radius_km && p.lat != null && haversineKm(alert.center[0], alert.center[1], p.lat, p.lon) <= alert.radius_km) {
    return VILLAGES.reduce((a, v) => (haversineKm(v.lat, v.lon, p.lat, p.lon) < haversineKm(a.lat, a.lon, p.lat, p.lon) ? v : a)).id;
  }
  return null;
}

$("sendBtn").addEventListener("click", async () => {
  const villages = [...S.selected];
  if (!villages.length) { $("sendResult").textContent = "Choose at least one village or draw a zone."; return; }
  const alert = { type: "alert", id: Math.random().toString(36).slice(2, 10), level: $("level").value, villages,
                  center: S.mode === "zone" ? S.zoneCenter : null, radius_km: S.mode === "zone" ? S.radiusKm : null,
                  test: $("isTest").checked, t: Date.now() / 1000 };
  $("sendBtn").disabled = true;
  const ok = await publish(S.room, alert);
  setTimeout(() => ($("sendBtn").disabled = false), 800);
  if (!ok) { $("sendResult").textContent = "Could not reach the relay — check the internet connection."; return; }
  handle(alert, true);
  zoomToAlert(alert);
});

function zoomToAlert(alert) {
  if (alert.center && S.zoneCircle) { map.fitBounds(S.zoneCircle.getBounds()); return; }
  const pts = alert.villages.map((id) => VMAP[id]).flatMap((v) => [[v.lat, v.lon], [v.safe.lat, v.safe.lon]]);
  if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.6), { maxZoom: 12 });
}

// ---------------------------------------------------------------- relay messages -> state
function handle(m, local) {
  const t = m._time ?? Date.now() / 1000;  // relay (server) time keeps ordering consistent across devices
  if (m.type === "reset") {
    if (t > S.resetAt) { S.resetAt = t; S.responses = {}; S.alerts = []; S.currentAlert = null; S.scenario = {};
      for (const id of Object.keys(S.phones)) if (S.phones[id].sim) delete S.phones[id];
      $("log").innerHTML = ""; $("sendResult").textContent = ""; refreshLive();
      if (!local) addLog("Demo reset — alerts, responses, test scenarios and simulated phones cleared"); }
  } else if (t < S.resetAt) {
    if (m.type === "join") upsertPhone(m); // phones stay joined across resets
    return;
  } else if (m.type === "join") {
    upsertPhone(m);
    addLog(`${m.name || "A phone"} joined — watching ${(m.villages || []).map((v) => VMAP[v]?.name).filter(Boolean).join(", ")}`);
  } else if (m.type === "alert") {
    if (S.alerts.some((a) => a.id === m.id)) return;
    S.alerts.push(m); S.currentAlert = m;
    let n = 0;
    for (const p of Object.values(S.phones)) {
      const vid = phoneMatches(p, m);
      if (!vid) continue;
      n++;
      S.responses[m.id + "|" + p.id] = { alert_id: m.id, phone_id: p.id, village_id: vid, status: "sent", lat: p.lat, lon: p.lon };
      if (p.sim) simulate(m.id, p.id);
    }
    $("sendResult").textContent = `Sent to ${n} phone(s) at ${fmtTime(m.t || t)}.`;
    addLog(`${m.level.toUpperCase()} sent to ${n} phone(s) — ${m.villages.map((v) => VMAP[v].name).join(", ")}${m.test ? " [TEST]" : ""}`);
  } else if (m.type === "ack" || m.type === "respond") {
    const key = m.alert_id + "|" + m.pid;
    let r = S.responses[key];
    if (!r) {
      const a = S.alerts.find((x) => x.id === m.alert_id);
      if (!a) return;
      r = S.responses[key] = { alert_id: m.alert_id, phone_id: m.pid, village_id: m.village || a.villages[0], status: "sent" };
    }
    const status = m.type === "ack" ? m.stage : m.status;
    if (RANK[status] >= RANK[r.status]) r.status = status;
    if (m.lat != null) { r.lat = m.lat; r.lon = m.lon; }
    if (m.type === "respond") {
      const p = S.phones[m.pid] || {};
      addLog(`${p.name || "Phone " + m.pid.slice(0, 4)} — ${status === "safe" ? "SAFE" : "NEEDS HELP"} (${VMAP[r.village_id]?.name || ""})`);
    }
  } else if (m.type === "scenario") {
    m.on ? (S.scenario[m.village] = true) : delete S.scenario[m.village];
    refreshLive();
  }
  renderResponses();
}

function upsertPhone(m) {
  S.phones[m.pid] = Object.assign(S.phones[m.pid] || {}, { id: m.pid, name: m.name, villages: m.villages || [], lang: m.lang, lat: m.lat, lon: m.lon, joined: m.t });
}

function simulate(alertId, pid) {
  const r = () => S.responses[alertId + "|" + pid];
  const step = (status, ms) => setTimeout(() => { const x = r(); if (x && RANK[status] >= RANK[x.status]) { x.status = status; renderResponses();
    if (status === "safe" || status === "help") addLog(`${S.phones[pid]?.name} — ${status === "safe" ? "SAFE" : "NEEDS HELP"} (simulated)`); } }, ms);
  step("delivered", 400 + Math.random() * 1100);
  step("played", 1200 + Math.random() * 2000);
  step(Math.random() < 0.12 ? "help" : "safe", 5000 + Math.random() * 18000);
}

$("simBtn").addEventListener("click", () => {
  const ids = S.selected.size ? [...S.selected] : ["mingora", "madyan", "bahrain"];
  const nSim = Object.values(S.phones).filter((p) => p.sim).length;
  for (let i = 0; i < 25; i++) {
    const v = VMAP[ids[Math.floor(Math.random() * ids.length)]];
    const id = "sim" + Math.random().toString(36).slice(2, 10);
    S.phones[id] = { id, name: `Simulated ${nSim + i + 1}`, villages: [v.id], lang: ["ur", "ps", "ur", "sd"][i % 4], sim: true,
                     lat: v.lat + (Math.random() - 0.5) * 0.03, lon: v.lon + (Math.random() - 0.5) * 0.036, joined: Date.now() / 1000 };
  }
  addLog(`Added 25 SIMULATED phones around ${ids.map((i) => VMAP[i].name).join(", ")} (only on this screen)`);
  renderResponses();
});

// ---------------------------------------------------------------- rendering
function currentResponses() { return S.currentAlert ? Object.values(S.responses).filter((r) => r.alert_id === S.currentAlert.id) : []; }
function renderResponses() {
  const rs = currentResponses();
  $("cOnline").textContent = Object.keys(S.phones).length;
  $("cWarned").textContent = rs.length;
  $("cSeen").textContent = rs.filter((r) => RANK[r.status] >= 2).length;
  $("cSafe").textContent = rs.filter((r) => r.status === "safe").length;
  $("cHelp").textContent = rs.filter((r) => r.status === "help").length;
  $("alertMeta").textContent = S.currentAlert ? `· alert ${S.currentAlert.level.toUpperCase()} at ${fmtTime(S.currentAlert.t)}${S.currentAlert.test ? " (DEMO)" : ""}` : "";
  const help = rs.filter((r) => r.status === "help");
  $("rescue").innerHTML = help.length ? '<div class="panel-h" style="color:#ff9b9b;margin:4px 0">Rescue queue</div>' + help.map((r) => {
    const p = S.phones[r.phone_id] || {};
    return `<div class="item"><b>${esc(p.name || "Phone " + r.phone_id.slice(0, 4))}</b> — ${esc(VMAP[r.village_id]?.name || "")}${r.lat != null && !p.sim ? " · GPS shared" : ""}</div>`;
  }).join("") : "";
  const rows = Object.values(S.phones).sort((a, b) => (b.joined || 0) - (a.joined || 0)).map((p) => {
    const r = rs.find((x) => x.phone_id === p.id);
    const where = (p.villages || []).map((v) => VMAP[v]?.name).filter(Boolean).join(", ");
    return `<div class="prow"><span>${esc(p.name || "Phone " + p.id.slice(0, 4))}${p.sim ? ' <span class="test">SIM</span>' : ""} <span class="muted">· ${esc(where)} · ${esc((p.lang || "").toUpperCase())}</span></span>
      <span class="st ${r ? r.status : ""}">${r ? STATUS_TEXT[r.status] : '<span class="muted">—</span>'}</span></div>`;
  });
  $("plist").innerHTML = rows.join("") || '<span class="muted">No phones yet — ask the judges to scan the QR code.</span>';
  drawResponders(rs);
}
function drawResponders(rs) {
  const keep = new Set();
  for (const r of rs) {
    const key = r.alert_id + "|" + r.phone_id; keep.add(key);
    let lat = r.lat, lon = r.lon;
    if (lat == null) { const v = VMAP[r.village_id], h = hash(r.phone_id); lat = v.lat + ((h % 100) - 50) / 3500; lon = v.lon + (((h >> 7) % 100) - 50) / 3000; }
    const style = { radius: 8, color: "#0b1726", weight: 2, fillColor: STATUS_COLOR[r.status] || "#ccc", fillOpacity: 1 };
    if (!S.responderMarkers[key]) S.responderMarkers[key] = L.circleMarker([lat, lon], style).addTo(map);
    else S.responderMarkers[key].setLatLng([lat, lon]).setStyle(style);
    S.responderMarkers[key].bindTooltip(`${S.phones[r.phone_id]?.name || "Phone"}: ${STATUS_TEXT[r.status]}`);
  }
  for (const k of Object.keys(S.responderMarkers)) if (!keep.has(k)) { map.removeLayer(S.responderMarkers[k]); delete S.responderMarkers[k]; }
}

async function refreshLive(force) {
  S.cache = await fetchLive(force);
  S.live = liveView(S.cache, S.scenario);
  const b = $("srcBadge");
  b.textContent = S.live.source === "live" ? `LIVE data · updated ${fmtTime(S.live.fetched_at)}` : `Data: ${S.live.source}`;
  b.className = "badge " + (S.live.source === "live" ? "live" : "off");
  $("riskBody").innerHTML = VILLAGES.map((v) => {
    const d = S.live.villages[v.id] || {};
    return `<tr><td>${esc(v.name)}</td><td>${d.rain_24h ?? "–"} mm</td><td>${d.rain_max_1h ?? "–"} mm</td><td>${d.river_ratio != null ? d.river_ratio + "×" : "n/a"}</td>
      <td><span class="lvl ${d.level}">${d.score} ${d.level.toUpperCase()}</span>${d.test ? '<span class="test">TEST</span>' : ""}</td></tr>`;
  }).join("");
  drawVillages();
}
$("refreshBtn").addEventListener("click", () => refreshLive(true));

function addLog(text) {
  const div = document.createElement("div");
  div.textContent = `${fmtTime(Date.now() / 1000)}  ${text}`;
  $("log").prepend(div);
  while ($("log").children.length > 120) $("log").lastChild.remove();
}

$("resetBtn").addEventListener("click", async () => {
  if (!confirm("Reset the demo? This clears alerts, responses, test scenarios and simulated phones (real phones stay joined).")) return;
  const ok = await publish(S.room, { type: "reset" });  // applied when the relay echoes it back
  if (!ok) addLog("Reset failed — relay not reachable");
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
setInterval(() => refreshLive(), 5 * 60 * 1000);

(function init() {
  setupRoom();
  drawVillages();
  map.fitBounds(L.latLngBounds(VILLAGES.map((v) => [v.lat, v.lon])).pad(0.15));
  renderSelection(); renderResponses();
  subscribe(S.room, "12h", (m) => handle(m, false), (st) => {
    $("relayBadge").textContent = st === "ok" ? "Relay connected" : "Relay reconnecting…";
    $("relayBadge").className = "badge " + (st === "ok" ? "live" : "off");
  });
  refreshLive();
})();
