/* Khabardar — officer control room */
const S = {
  villages: [], vmap: {}, live: null, phones: {}, responses: {}, alerts: [],
  selected: new Set(), mode: "villages", zoneCenter: null, radiusKm: 20, currentAlert: null,
  markers: {}, safeMarkers: {}, responderMarkers: {}, zoneCircle: null, sseOpen: false
};
const LEVEL_COLOR = { normal: "#2bb673", watch: "#f5c542", warning: "#f28c28", evacuate: "#e5383b" };
const STATUS_COLOR = { sent: "#c9d6e5", delivered: "#7fc8ff", played: "#f5c542", safe: "#2bb673", help: "#e5383b" };
const STATUS_TEXT = { sent: "Sent", delivered: "Delivered", played: "Siren played", safe: "SAFE", help: "NEEDS HELP" };
const $ = (id) => document.getElementById(id);

async function api(path, body) {
  const opt = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const r = await fetch(path, opt);
  return r.json();
}
const fmtTime = (t) => new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function hash(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

// ---------------------------------------------------------------- map
const map = L.map("map", { zoomControl: true }).setView([31.5, 71.5], 6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18, attribution: "© OpenStreetMap contributors"
}).addTo(map);

function villageLevel(id) { return S.live?.villages?.[id]?.level || "normal"; }

function drawVillages() {
  for (const v of S.villages) {
    const sel = S.selected.has(v.id);
    const style = { radius: sel ? 13 : 10, color: sel ? "#ffffff" : "#0b1726", weight: sel ? 4 : 2,
                    fillColor: LEVEL_COLOR[villageLevel(v.id)], fillOpacity: 0.95 };
    if (!S.markers[v.id]) {
      const m = L.circleMarker([v.lat, v.lon], style).addTo(map);
      m.bindTooltip(v.name, { permanent: true, direction: "right", offset: [10, 0], className: "" });
      m.on("click", () => onVillageClick(v.id));
      S.markers[v.id] = m;
      const icon = L.divIcon({ className: "", html: '<div style="width:10px;height:10px;background:#7fe0ff;border:2px solid #0b1726"></div>', iconSize: [10, 10] });
      S.safeMarkers[v.id] = L.marker([v.safe.lat, v.safe.lon], { icon }).addTo(map).bindTooltip("Safe point (demo): " + v.safe.name);
    } else {
      S.markers[v.id].setStyle(style);
    }
    S.markers[v.id].bindPopup(popupHtml(v));
  }
}

function popupHtml(v) {
  const d = S.live?.villages?.[v.id] || {};
  const ratio = d.river_ratio != null ? d.river_ratio + "×" : "n/a";
  return `<b>${esc(v.name)}</b> (${esc(v.district)})<br>
    Rain next 24h: <b>${d.rain_24h ?? "–"} mm</b> · max 1h: <b>${d.rain_max_1h ?? "–"} mm</b><br>
    River peak vs normal: <b>${ratio}</b><br>
    Risk: <b>${d.score ?? "–"}</b> — <span class="lvl ${d.level || "normal"}">${(d.level || "normal").toUpperCase()}</span>${d.test ? '<span class="test">TEST</span>' : ""}<br>
    <button class="mini" onclick="toggleScenario('${v.id}', ${!d.test})">${d.test ? "Turn TEST scenario off" : "Simulate heavy rain (TEST)"}</button>`;
}

function onVillageClick(id) {
  if (S.mode !== "villages") return;
  if (S.selected.has(id)) S.selected.delete(id); else S.selected.add(id);
  drawVillages(); renderSelection();
}

map.on("click", (e) => {
  if (S.mode !== "zone") return;
  S.zoneCenter = [e.latlng.lat, e.latlng.lng];
  drawZone();
});

function drawZone() {
  if (S.zoneCircle) { map.removeLayer(S.zoneCircle); S.zoneCircle = null; }
  if (S.mode === "zone" && S.zoneCenter) {
    S.zoneCircle = L.circle(S.zoneCenter, { radius: S.radiusKm * 1000, color: "#f05a28", weight: 2, fillOpacity: 0.12 }).addTo(map);
    S.selected = new Set(S.villages.filter((v) => distKm(S.zoneCenter, [v.lat, v.lon]) <= S.radiusKm).map((v) => v.id));
  }
  drawVillages(); renderSelection();
}

function distKm(a, b) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLon = (b[1] - a[1]) * toR;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

window.toggleScenario = async (id, on) => {
  await api("/api/scenario", { village_id: id, on });
  await loadLive();
  map.closePopup();
};

// ---------------------------------------------------------------- composer
document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener("change", (e) => {
  S.mode = e.target.value;
  $("zoneRow").hidden = S.mode !== "zone";
  $("mapHint").textContent = S.mode === "zone" ? "Click the map to place the danger zone" : "Click villages to select them · or switch to “Draw zone” and click the map";
  if (S.mode === "villages") { S.zoneCenter = null; }
  S.selected.clear(); drawZone();
}));
$("radius").addEventListener("input", (e) => { S.radiusKm = +e.target.value; $("radiusVal").textContent = S.radiusKm; drawZone(); });
$("level").addEventListener("change", renderPreview);

function renderSelection() {
  const ids = [...S.selected];
  $("selChips").innerHTML = ids.length ? ids.map((id) => `<span class="chip">${esc(S.vmap[id].name)}</span>`).join("")
    : `<span class="muted">${S.mode === "zone" ? "Click the map to draw a zone" : "No village selected"}</span>`;
  renderPreview();
}

async function renderPreview() {
  const id = [...S.selected][0];
  if (!id) { $("preview").innerHTML = '<span class="muted">Message preview appears here.</span>'; return; }
  const r = await api(`/api/preview?village=${id}&level=${$("level").value}`);
  if (!r.ok) return;
  const t = r.texts;
  $("preview").innerHTML = `<b>${esc(t.en.title)}</b> — ${esc(t.en.body)}<div class="ur"><b>${esc(t.ur.title)}</b> — ${esc(t.ur.body)}</div>
    <div class="muted small">Each phone gets this in its own language (Urdu, Pashto, Sindhi or English), with a siren and a voice message.</div>`;
}

$("sendBtn").addEventListener("click", async () => {
  const body = { level: $("level").value, test: $("isTest").checked };
  if (S.mode === "zone" && S.zoneCenter) { body.center = S.zoneCenter; body.radius_km = S.radiusKm; }
  else body.village_ids = [...S.selected];
  $("sendBtn").disabled = true;
  try {
    const r = await api("/api/alert", body);
    if (!r.ok) { $("sendResult").textContent = r.error || "Could not send."; return; }
    S.currentAlert = r.alert;
    $("sendResult").textContent = `Sent to ${r.recipients} phone(s) at ${fmtTime(r.alert.t)}.`;
    zoomToAlert(r.alert);
    renderResponses();
  } finally { setTimeout(() => ($("sendBtn").disabled = false), 800); }
});

function zoomToAlert(alert) {
  const pts = (alert.villages || []).map((id) => S.vmap[id]).filter(Boolean).flatMap((v) => [[v.lat, v.lon], [v.safe.lat, v.safe.lon]]);
  if (alert.center && alert.radius_km && S.zoneCircle) { map.fitBounds(S.zoneCircle.getBounds()); return; }
  if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.6), { maxZoom: 12 });
}

// ---------------------------------------------------------------- responses
function currentResponses() {
  if (!S.currentAlert) return [];
  return Object.values(S.responses).filter((r) => r.alert_id === S.currentAlert.id);
}

function renderResponses() {
  const online = Object.values(S.phones).filter((p) => p.connected).length;
  const rs = currentResponses();
  $("cOnline").textContent = online;
  $("cWarned").textContent = rs.length;
  $("cSeen").textContent = rs.filter((r) => r.t_played || r.status === "safe" || r.status === "help").length;
  $("cSafe").textContent = rs.filter((r) => r.status === "safe").length;
  $("cHelp").textContent = rs.filter((r) => r.status === "help").length;
  $("alertMeta").textContent = S.currentAlert ? `· alert ${S.currentAlert.level.toUpperCase()} at ${fmtTime(S.currentAlert.t)}${S.currentAlert.test ? " (DEMO)" : ""}` : "";

  const help = rs.filter((r) => r.status === "help");
  $("rescue").innerHTML = help.length ? '<div class="panel-h" style="color:#ff9b9b;margin:4px 0">Rescue queue</div>' + help.map((r) => {
    const p = S.phones[r.phone_id] || {};
    return `<div class="item"><b>${esc(p.name || "Phone " + r.phone_id.slice(0, 4))}</b> — ${esc(S.vmap[r.village_id]?.name || "")} · ${fmtTime(r.t_response)}${r.lat != null ? " · GPS shared" : ""}</div>`;
  }).join("") : "";

  const rows = Object.values(S.phones).sort((a, b) => (b.joined || 0) - (a.joined || 0)).map((p) => {
    const r = rs.find((x) => x.phone_id === p.id);
    const st = r ? r.status : null;
    const where = (p.villages || []).map((v) => S.vmap[v]?.name).filter(Boolean).join(", ");
    return `<div class="prow"><span>${p.connected ? "🟢" : "⚪"} ${esc(p.name || "Phone " + p.id.slice(0, 4))}${p.sim ? ' <span class="test">SIM</span>' : ""} <span class="muted">· ${esc(where)} · ${esc((p.lang || "").toUpperCase())}</span></span>
      <span class="st ${st || ""}">${st ? STATUS_TEXT[st] : '<span class="muted">—</span>'}</span></div>`;
  });
  $("plist").innerHTML = rows.join("") || '<span class="muted">No phones yet — ask the judges to scan the QR code.</span>';
  drawResponders(rs);
}

function drawResponders(rs) {
  const keep = new Set();
  for (const r of rs) {
    const key = r.alert_id + "|" + r.phone_id;
    keep.add(key);
    let lat = r.lat, lon = r.lon;
    if (lat == null || lon == null) {
      const v = S.vmap[r.village_id]; const h = hash(r.phone_id);
      lat = v.lat + ((h % 100) - 50) / 3500; lon = v.lon + (((h >> 7) % 100) - 50) / 3000;
    }
    const style = { radius: 8, color: "#0b1726", weight: 2, fillColor: STATUS_COLOR[r.status] || "#ccc", fillOpacity: 1 };
    if (!S.responderMarkers[key]) S.responderMarkers[key] = L.circleMarker([lat, lon], style).addTo(map);
    else S.responderMarkers[key].setLatLng([lat, lon]).setStyle(style);
    const p = S.phones[r.phone_id] || {};
    S.responderMarkers[key].bindTooltip(`${p.name || "Phone"}: ${STATUS_TEXT[r.status]}`);
  }
  for (const k of Object.keys(S.responderMarkers)) {
    if (!keep.has(k)) { map.removeLayer(S.responderMarkers[k]); delete S.responderMarkers[k]; }
  }
}

// ---------------------------------------------------------------- live risk table
async function loadLive(force) {
  try {
    S.live = await api("/api/live" + (force ? "?refresh=1" : ""));
  } catch { return; }
  const b = $("srcBadge");
  const src = S.live.source || "";
  b.textContent = src === "live" ? `LIVE data · updated ${fmtTime(S.live.fetched_at)}` : `Data: ${src}`;
  b.className = "badge " + (src === "live" ? "live" : "off");
  const rows = S.villages.map((v) => {
    const d = S.live.villages[v.id] || {};
    return `<tr><td>${esc(v.name)}</td><td>${d.rain_24h ?? "–"} mm</td><td>${d.rain_max_1h ?? "–"} mm</td>
      <td>${d.river_ratio != null ? d.river_ratio + "×" : "n/a"}</td>
      <td><span class="lvl ${d.level || "normal"}">${d.score ?? 0} ${(d.level || "normal").toUpperCase()}</span>${d.test ? '<span class="test">TEST</span>' : ""}</td></tr>`;
  });
  $("riskBody").innerHTML = rows.join("");
  drawVillages();
}
$("refreshBtn").addEventListener("click", () => loadLive(true));

// ---------------------------------------------------------------- log, replay, reset
function addLog(e) {
  const div = document.createElement("div");
  div.textContent = `${fmtTime(e.t)}  ${e.text}`;
  $("log").prepend(div);
  while ($("log").children.length > 120) $("log").lastChild.remove();
}

$("resetBtn").addEventListener("click", async () => {
  if (!confirm("Reset the demo? This clears alerts, responses and test scenarios (phones stay joined).")) return;
  await api("/api/reset", {});
});

$("replayBtn").addEventListener("click", openReplay);
$("simBtn").addEventListener("click", async () => {
  const ids = S.selected.size ? [...S.selected] : ["mingora", "madyan", "bahrain"];
  await api("/api/simulate", { count: 25, village_ids: ids });
});
$("closeReplay").addEventListener("click", () => ($("replayModal").hidden = true));

function openReplay() {
  $("replayModal").hidden = false;
  const bars = [
    { label: "Day before (May 2025)", v: 35600 },
    { label: "Next morning (May 2025)", v: 3177 },
    { label: "16 Dec 2025", v: 1800 }
  ];
  const max = 36000, w = 780, h = 240, bw = 150, gap = 90, base = 200;
  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" style="background:#0d1c2f;border-radius:8px">`;
  bars.forEach((b, i) => {
    const bh = (b.v / max) * 170, x = 80 + i * (bw + gap);
    svg += `<rect x="${x}" y="${base - bh}" width="${bw}" height="${bh}" rx="6" fill="${i === 0 ? "#3b82c4" : "#e5383b"}"/>`;
    svg += `<text x="${x + bw / 2}" y="${base - bh - 8}" fill="#eef3f9" font-size="16" font-weight="700" text-anchor="middle">${b.v.toLocaleString()} cusecs</text>`;
    svg += `<text x="${x + bw / 2}" y="${base + 22}" fill="#9fb1c6" font-size="13" text-anchor="middle">${b.label}</text>`;
  });
  svg += `<text x="20" y="22" fill="#9fb1c6" font-size="13">Chenab flow at Marala headworks — sudden drops without notice</text></svg>`;
  $("replayChart").innerHTML = svg;
  fetch("/static/replay/manifest.json").then((r) => (r.ok ? r.json() : null)).then((m) => {
    if (!m || !m.images || !m.images.length) return;
    $("satImages").innerHTML = m.images.map((im) => `<figure><img src="/static/replay/${esc(im.file)}" alt=""><figcaption>${esc(im.caption || "")}</figcaption></figure>`).join("");
  }).catch(() => {});
}

// ---------------------------------------------------------------- real-time stream
function connect() {
  const es = new EventSource("/events/dashboard");
  es.onopen = () => (S.sseOpen = true);
  es.onerror = () => (S.sseOpen = false);
  es.addEventListener("log", (e) => addLog(JSON.parse(e.data)));
  es.addEventListener("phone", (e) => { const p = JSON.parse(e.data); S.phones[p.id] = p; renderResponses(); });
  es.addEventListener("alert_sent", (e) => { const d = JSON.parse(e.data); S.currentAlert = d.alert; S.alerts.push(d.alert); loadState(); });
  es.addEventListener("response", (e) => { const r = JSON.parse(e.data); S.responses[r.alert_id + "|" + r.phone_id] = r; renderResponses(); });
  es.addEventListener("live_changed", () => loadLive());
  es.addEventListener("reset", () => { S.responses = {}; S.alerts = []; S.currentAlert = null; $("log").innerHTML = ""; $("sendResult").textContent = ""; loadLive(); loadState(); });
}

async function loadState() {
  const st = await api("/api/state");
  S.phones = {}; st.phones.forEach((p) => (S.phones[p.id] = p));
  S.responses = {}; st.responses.forEach((r) => (S.responses[r.alert_id + "|" + r.phone_id] = r));
  S.alerts = st.alerts;
  if (!S.currentAlert && st.alerts.length) S.currentAlert = st.alerts[st.alerts.length - 1];
  renderResponses();
  return st;
}

async function loadInfo() {
  const info = await api("/api/info");
  const url = (info.join_urls && info.join_urls[0]) || location.origin + "/phone";
  $("joinUrl").textContent = url;
  if (window.QRCode) new QRCode($("qr"), { text: url, width: 84, height: 84, correctLevel: QRCode.CorrectLevel.M });
  else $("qr").textContent = "QR needs internet";
}

setInterval(() => { $("clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }, 1000);
setInterval(() => loadLive(), 5 * 60 * 1000);
setInterval(() => { if (!S.sseOpen) loadState(); }, 8000);

(async function init() {
  const vs = await api("/api/villages");
  S.villages = vs.villages; S.villages.forEach((v) => (S.vmap[v.id] = v));
  drawVillages();
  map.fitBounds(L.latLngBounds(S.villages.map((v) => [v.lat, v.lon])).pad(0.15));
  renderSelection();
  const st = await loadState();
  (st.log || []).forEach(addLog);
  loadInfo();
  connect();
  loadLive();
})();
