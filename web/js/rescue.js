/* Khabardar — rescue queue for the control room.
   Everyone who tapped "I need help": where they are, how urgent, the nearest (demo) rescue team and an estimated
   arrival time. Status changes are sent back to the person's phone ("Rescue 1122 Swat is on the way"). */

const Rescue = (() => {
  const SPEED_KMH = 25, DISPATCH_MIN = 5;
  const NEED_LABEL = { injured: "Injured", water: "Water rising", elderly: "Elderly / disabled", pregnant: "Pregnant", children: "Children" };

  function list() { return Object.entries(S.responses).filter(([, r]) => r.status === "help").map(([k, r]) => Object.assign({ key: k }, r)); }
  function where(r) {
    if (r.lat != null && r.lon != null) return { lat: r.lat, lon: r.lon, gps: true };
    const v = VMAP[r.village_id];
    const h = hashStr(r.phone_id);
    return { lat: v.lat + ((h % 100) - 50) / 6000, lon: v.lon + (((h >> 7) % 100) - 50) / 5000, gps: false };
  }
  function priority(r) {
    const d = r.details || {};
    let s = 1;
    if (d.injured) s += 4; if (d.water) s += 3; if (d.elderly) s += 2; if (d.pregnant) s += 2; if (d.children) s += 1;
    s += Math.min(d.people || 1, 12) * 0.3;
    s += Math.min(30, (Date.now() / 1000 - (r.t_help || Date.now() / 1000)) / 60) * 0.15;
    return { score: s, label: s >= 6 ? "HIGH" : s >= 3 ? "MEDIUM" : "LOW" };
  }
  function nearestTeam(lat, lon, water) {
    let best = null, bd = 1e9;
    for (const t of RESCUE_TEAMS) {
      let d = haversineKm(t.lat, t.lon, lat, lon);
      if (water && t.kind === "boat") d /= 1.5;           // prefer a boat team when water is rising
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  const etaMin = (t, lat, lon) => Math.round(DISPATCH_MIN + (haversineKm(t.lat, t.lon, lat, lon) / SPEED_KMH) * 60);

  function share(r) {
    const p = S.phones[r.phone_id];
    if (!p || p.dummy || p.sim) return;
    publish(S.room, { type: "rescue", pid: r.phone_id, alert_id: r.alert_id, status: r.rescue.status, team: r.rescue.team, team_id: r.rescue.team_id, eta_min: r.rescue.eta_min });
  }
  function assign(key, quiet) {
    const r = S.responses[key];
    if (!r || r.status !== "help" || (r.rescue && r.rescue.status !== "waiting")) return false;
    const w = where(r), team = nearestTeam(w.lat, w.lon, r.details && r.details.water), eta = etaMin(team, w.lat, w.lon);
    r.rescue = { status: "assigned", team: team.name, team_id: team.id, eta_min: eta, t: Date.now() / 1000 };
    share(r);
    addLog(`${team.name} sent to ${S.phones[r.phone_id]?.name || "caller"} (${VMAP[r.village_id].name}) — about ${eta} min`);
    if (!quiet) scheduleRender();
    return true;
  }
  function done(key) {
    const r = S.responses[key];
    if (!r) return;
    r.rescue = Object.assign({}, r.rescue || {}, { status: "rescued", t_done: Date.now() / 1000 });
    share(r);
    addLog(`${S.phones[r.phone_id]?.name || "Caller"} marked RESCUED (${VMAP[r.village_id].name})`);
    scheduleRender();
  }
  function assignAll() {
    const waiting = list().filter((r) => !r.rescue || r.rescue.status === "waiting").sort((a, b) => priority(b).score - priority(a).score);
    waiting.forEach((r) => assign(r.key, true));
    if (!waiting.length) addLog("Rescue: nobody is waiting for a team");
    scheduleRender();
  }
  function applyRemote(m) {           // another control room changed a rescue status
    const r = S.responses[m.alert_id + "|" + m.pid];
    if (r) r.rescue = { status: m.status, team: m.team, team_id: m.team_id, eta_min: m.eta_min, t: m._time || Date.now() / 1000 };
  }

  function needsHtml(d) {
    if (!d) return '<span class="muted">No details yet</span>';
    const out = [`<span class="need">${d.people || 1} ${d.people === 1 ? "person" : "people"}</span>`];
    for (const k of ["injured", "water", "elderly", "pregnant", "children"]) if (d[k]) out.push(`<span class="need ${k === "injured" || k === "water" ? "hot" : ""}">${NEED_LABEL[k]}</span>`);
    return out.join("");
  }
  function navUrl(w) { return `https://www.google.com/maps/dir/?api=1&destination=${w.lat.toFixed(5)},${w.lon.toFixed(5)}&travelmode=driving`; }

  function render() {
    const items = list().sort((a, b) => {
      const order = (r) => (!r.rescue || r.rescue.status === "waiting" ? 0 : r.rescue.status === "assigned" ? 1 : 2);
      return order(a) - order(b) || priority(b).score - priority(a).score;
    });
    const open = items.filter((r) => !r.rescue || r.rescue.status !== "rescued").length;
    $("tRescue").textContent = open;
    if (!items.length) {
      $("rescueList").innerHTML = '<span class="muted small">Nobody has asked for help yet. People who tap “I need help” appear here, highest priority first.</span>';
      return;
    }
    $("rescueList").innerHTML = items.map((r) => {
      const p = S.phones[r.phone_id] || {}, v = VMAP[r.village_id], w = where(r), pr = priority(r);
      const st = (r.rescue && r.rescue.status) || "waiting";
      const tag = p.dummy ? '<span class="tag dummy">DUMMY</span>' : p.sim ? '<span class="tag sim">SIM</span>' : '<span class="tag real">REAL</span>';
      const safeKm = haversineKm(w.lat, w.lon, v.safe.lat, v.safe.lon).toFixed(1);
      const loc = w.gps ? `GPS ${w.lat.toFixed(4)}, ${w.lon.toFixed(4)}` : "no GPS — search the village area";
      let status;
      if (st === "waiting") status = `<b style="color:#ff9b9b">Waiting for a team</b> · ${fmtAgo(Date.now() / 1000 - (r.t_help || Date.now() / 1000))}`;
      else if (st === "assigned") status = `<b style="color:#ffd9b0">${esc(r.rescue.team)} on the way</b> · about ${r.rescue.eta_min} min (estimate)`;
      else status = `<b style="color:#bff0d6">Rescued ✓</b> ${r.rescue.t_done ? fmtTime(r.rescue.t_done) : ""}`;
      return `<div class="rcard ${st}">
        <div class="rh"><span><span class="prio ${pr.label}">${pr.label}</span> <span class="rn">${esc(p.name || "Phone " + r.phone_id.slice(0, 4))}</span>${tag}</span>
          <span class="muted">${esc(v.name)} · ${esc(v.district)}</span></div>
        <div>${needsHtml(r.details)}</div>
        <div class="muted">${loc} · safe point ${esc(v.safe.name)} ${safeKm} km away</div>
        <div>${status}</div>
        <div class="racts">
          ${st === "waiting" ? `<button class="mini go" onclick="Rescue.assign('${r.key}')">Send nearest team</button>` : ""}
          ${st === "assigned" ? `<button class="mini ok" onclick="Rescue.done('${r.key}')">Mark rescued</button>` : ""}
          <button class="mini" onclick="Rescue.locate('${r.key}')">Show on map</button>
          <a href="${navUrl(w)}" target="_blank" rel="noopener">Directions for team ↗</a>
        </div></div>`;
    }).join("");
  }

  function drawMap() {
    const keep = new Set();
    for (const r of list()) {
      keep.add(r.key);
      const w = where(r), st = (r.rescue && r.rescue.status) || "waiting", p = S.phones[r.phone_id] || {};
      const icon = L.divIcon({ className: "", html: `<div class="help-pin ${st}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
      let m = S.rescueMarkers[r.key];
      if (!m) { m = S.rescueMarkers[r.key] = L.marker([w.lat, w.lon], { icon, zIndexOffset: 1000 }).addTo(S.layers.rescue); }
      else { m.setLatLng([w.lat, w.lon]); m.setIcon(icon); }
      m.bindTooltip(`${esc(p.name || "Caller")} — ${st === "waiting" ? "NEEDS HELP" : st === "assigned" ? "team on the way" : "rescued"} (${(r.details && r.details.people) || 1} people)`);
      let line = S.rescueLines[r.key];
      const team = r.rescue && RESCUE_TEAMS.find((t) => t.id === r.rescue.team_id);
      if (st === "assigned" && team) {
        const pts = [[team.lat, team.lon], [w.lat, w.lon]];
        if (!line) line = S.rescueLines[r.key] = L.polyline(pts, { color: "#f28c28", weight: 3, dashArray: "6 6" }).addTo(S.layers.rescue);
        else line.setLatLngs(pts);
      } else if (line) { S.layers.rescue.removeLayer(line); delete S.rescueLines[r.key]; }
    }
    for (const k of Object.keys(S.rescueMarkers)) if (!keep.has(k)) { S.layers.rescue.removeLayer(S.rescueMarkers[k]); delete S.rescueMarkers[k]; }
    for (const k of Object.keys(S.rescueLines)) if (!keep.has(k)) { S.layers.rescue.removeLayer(S.rescueLines[k]); delete S.rescueLines[k]; }
  }
  function locate(key) {
    const r = S.responses[key]; if (!r) return;
    const w = where(r);
    map.flyTo([w.lat, w.lon], 14, { duration: 0.8 });
    setTimeout(() => S.rescueMarkers[key] && S.rescueMarkers[key].openTooltip(), 900);
  }

  function csv() {
    const rows = [["priority", "name", "phone_type", "place", "district", "province", "latitude", "longitude", "gps", "people", "injured", "water_rising", "elderly_disabled", "pregnant", "children", "status", "team", "eta_min", "asked_for_help_at", "nearest_safe_point"]];
    for (const r of list().sort((a, b) => priority(b).score - priority(a).score)) {
      const p = S.phones[r.phone_id] || {}, v = VMAP[r.village_id], w = where(r), d = r.details || {};
      rows.push([priority(r).label, p.name || r.phone_id, p.dummy ? "dummy" : p.sim ? "simulated" : "real", v.name, v.district, PROVINCE_NAMES[v.province], w.lat.toFixed(5), w.lon.toFixed(5), w.gps ? "yes" : "village area",
        d.people || "", d.injured ? "yes" : "", d.water ? "yes" : "", d.elderly ? "yes" : "", d.pregnant ? "yes" : "", d.children ? "yes" : "",
        (r.rescue && r.rescue.status) || "waiting", (r.rescue && r.rescue.team) || "", (r.rescue && r.rescue.eta_min) || "", r.t_help ? new Date(r.t_help * 1000).toISOString() : "", v.safe.name + " (demo)"]);
    }
    const text = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    a.download = `khabardar-rescue-list-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    addLog(`Rescue list downloaded (${rows.length - 1} people)`);
  }

  return { list, where, priority, assign, done, assignAll, applyRemote, render, drawMap, locate, csv, needsHtml };
})();
