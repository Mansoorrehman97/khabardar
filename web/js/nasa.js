/* Khabardar — NASA satellite data (no key needed).
   - Map layers from NASA GIBS (Global Imagery Browse Services):
       MODIS Combined Flood (3-day), GPM IMERG precipitation rate, SMAP root-zone soil moisture,
       Global Flood Hazard 1985-2003 (NASA SEDAC/NDH), VIIRS NOAA-20 true-colour image.
   - Numbers for the risk score are read from the same map tiles: each pixel's colour is turned back into a value
     with NASA's published colour keys (nasa-colormaps.js).
   - NASA EONET (Earth Observatory Natural Event Tracker): recent floods, storms and landslides in the region. */

const NASA = (() => {
  const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
  const FLOOD = { id: "MODIS_Combined_Flood_3-Day", tms: "GoogleMapsCompatible_Level9", maxZ: 9 };
  const FLOOD_VIIRS = { id: "VIIRS_Combined_Flood_3-Day", tms: "GoogleMapsCompatible_Level9", maxZ: 9 };
  const VIIRS_FROM = "2025-06-24"; // VIIRS (NOAA-20 + NOAA-21) flood product available in GIBS from this date
  const RAIN = { id: "IMERG_Precipitation_Rate_30min", tms: "GoogleMapsCompatible_Level6", maxZ: 6 };
  const RAIN_DAILY = { id: "IMERG_Precipitation_Rate", tms: "GoogleMapsCompatible_Level6", maxZ: 6 };
  const SOIL = { id: "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture", tms: "GoogleMapsCompatible_Level6", maxZ: 6 };
  const HAZARD = { id: "NDH_Flood_Hazard_Frequency_Distribution_1985-2003", tms: "GoogleMapsCompatible_Level7", maxZ: 7 };
  const TRUECOLOR = { id: "VIIRS_NOAA20_CorrectedReflectance_TrueColor", tms: "GoogleMapsCompatible_Level9", maxZ: 9 };
  const RADAR_WATER = { id: "OPERA_L3_Dynamic_Surface_Water_Extent-Sentinel-1", tms: "GoogleMapsCompatible_Level12", maxZ: 12 };
  const RADAR_IMAGE = { id: "OPERA_L2_Radiometric_Terrain_Corrected_SAR_Sentinel-1", tms: "GoogleMapsCompatible_Level12", maxZ: 12 };
  const POP = { id: "GPW_Population_Density_2020", tms: "GoogleMapsCompatible_Level7", maxZ: 7 };
  const SNOW = { id: "VIIRS_NOAA20_NDSI_Snow_Cover", tms: "GoogleMapsCompatible_Level8", maxZ: 8 };
  const LANDSLIDE = { id: "NDH_Landslide_Hazard_Distribution_2000", tms: "GoogleMapsCompatible_Level7", maxZ: 7 };
  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const REPLAYS = [
    { date: "2022-08-30", label: "30 Aug 2022 — Sindh & Balochistan floods" },
    { date: "2025-09-05", label: "5 Sep 2025 — Punjab floods (Chenab, Ravi, Sutlej)" }
  ];
  const ATTR = 'NASA GIBS · <a href="https://www.earthdata.nasa.gov/data/tools/gibs" target="_blank" rel="noopener">EOSDIS</a>';

  function url(layer, time, z, y, x, ext = "png") {
    return time ? `${GIBS}/${layer.id}/default/${time}/${layer.tms}/${z}/${y}/${x}.${ext}` : `${GIBS}/${layer.id}/default/${layer.tms}/${z}/${y}/${x}.${ext}`;
  }
  function yesterdayUTC() { return new Date(Date.now() - 86400000).toISOString().slice(0, 10); }

  // ------------------------------------------------------------ tile pixels
  const tiles = new Map();
  let active = 0; const waiting = [];
  async function limited(fn) {
    if (active >= 6) await new Promise((r) => waiting.push(r));
    active++;
    try { return await fn(); } finally { active--; const next = waiting.shift(); if (next) next(); }
  }
  function tile(u) {
    if (!tiles.has(u)) {
      const p = limited(async () => {
        for (let attempt = 0; attempt < 3; attempt++) {   // NASA's tile server sometimes answers 500: try again
          try {
            const r = await fetch(u);
            if (r.ok) {
              const bmp = await createImageBitmap(await r.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
              const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
              const g = c.getContext("2d", { willReadFrequently: true });
              g.drawImage(bmp, 0, 0);
              return g.getImageData(0, 0, c.width, c.height);
            }
            if (r.status < 500) return null;             // 400/404: no image for this tile or date
          } catch (e) { /* network hiccup */ }
          await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
        }
        return null;
      });
      tiles.set(u, p);
      p.then((d) => { if (!d && tiles.get(u) === p) tiles.delete(u); }); // do not remember failures
      if (tiles.size > 400) tiles.delete(tiles.keys().next().value);
    }
    return tiles.get(u);
  }
  function project(lat, lon, z) {
    const n = 256 * 2 ** z, s = Math.sin((lat * Math.PI) / 180);
    return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n];
  }
  /* All pixels within radiusM metres of a point: [[r,g,b,a], ...]; null if NASA could not be reached. */
  async function pixelsAround(layer, time, z, lat, lon, radiusM) {
    const res = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
    const R = Math.max(1, Math.round(radiusM / res));
    const [px, py] = project(lat, lon, z);
    const need = new Map(), pts = [];
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > R * R) continue;
      const gx = Math.floor(px + dx), gy = Math.floor(py + dy), tx = Math.floor(gx / 256), ty = Math.floor(gy / 256);
      const key = tx + "/" + ty;
      if (!need.has(key)) need.set(key, tile(url(layer, time, z, ty, tx)));
      pts.push([key, gx - tx * 256, gy - ty * 256]);
    }
    const loaded = {};
    await Promise.all([...need].map(async ([k, p]) => (loaded[k] = await p)));
    if (Object.values(loaded).every((d) => !d)) return null;
    const out = [];
    for (const [k, x, y] of pts) {
      const d = loaded[k];
      if (!d) { out.push([0, 0, 0, 0]); continue; }   // keep positions aligned between dates
      const i = (y * d.width + x) * 4;
      out.push([d.data[i], d.data[i + 1], d.data[i + 2], d.data[i + 3]]);
    }
    return out;
  }
  const near = (p, c, tol = 8) => Math.abs(p[0] - c[0]) <= tol && Math.abs(p[1] - c[1]) <= tol && Math.abs(p[2] - c[2]) <= tol;
  function decode(p, table) {
    if (p[3] < 128) return null;
    let best = null, bd = 1e9;
    for (const e of table) {
      const d = (p[0] - e[0]) ** 2 + (p[1] - e[1]) ** 2 + (p[2] - e[2]) ** 2;
      if (d < bd) { bd = d; best = e; if (d === 0) break; }
    }
    if (!best || bd > 300) return null;
    return best[4] > best[3] * 10 ? best[3] : (best[3] + best[4]) / 2;   // open-ended top class ("1000 and more"): use its lower edge
  }

  function floodStats(fp) {
    let flood = 0, rec = 0, water = 0, nodata = 0;
    for (const p of fp) {
      if (p[3] < 128) continue;
      if (near(p, NASA_CM.flood.flood)) flood++;
      else if (near(p, NASA_CM.flood.recurring)) rec++;
      else if (near(p, NASA_CM.flood.water)) water++;
      else if (near(p, NASA_CM.flood.nodata)) nodata++;
    }
    const n = fp.length;
    return { flood, rec, water, nodata, n, frac: (flood + 0.5 * rec) / n, cloud: nodata / n, seen: nodata / n < 0.9 };
  }
  const useViirs = (date) => !date || date === "latest" || date >= VIIRS_FROM;

  /* NASA numbers for each place. date "latest" = newest data; or "YYYY-MM-DD" for a flood replay (flood map only).
     Flood water: when both NASA flood products (MODIS and VIIRS) have a clear view, both must agree — this removes
     false alarms such as mountain shadows. With only one clear view, that one is used. */
  async function sampleVillages(vs, date = "latest") {
    const latest = !date || date === "latest";
    const ftime = latest ? "default" : date;
    const out = {};
    await Promise.all(vs.map(async (v) => {
      const s = { nasa_ok: false };
      const [mp, vp] = await Promise.all([pixelsAround(FLOOD, ftime, 8, v.lat, v.lon, 6000),
        useViirs(date) ? pixelsAround(FLOOD_VIIRS, ftime, 8, v.lat, v.lon, 6000) : Promise.resolve(null)]);
      const m = mp && mp.length ? floodStats(mp) : null, w = vp && vp.length ? floodStats(vp) : null;
      const views = [m, w].filter((x) => x && x.seen);
      const pickStat = views.length === 2 ? (m.frac <= w.frac ? m : w) : views[0] || m || w;
      if (pickStat) {
        // VIIRS should exist but could not be loaded: a MODIS-only reading is not trusted beyond Watch level
        const unconfirmed = useViirs(date) && !w && pickStat === m;
        const frac = unconfirmed ? Math.min(pickStat.frac, 0.049) : pickStat.frac;
        Object.assign(s, { nasa_ok: true, nasa_flood_px: pickStat.flood, nasa_recurring_px: pickStat.rec, nasa_water_px: pickStat.water,
          nasa_flood_frac: +frac.toFixed(4), nasa_cloud_frac: +Math.min(m ? m.cloud : 1, w ? w.cloud : 1).toFixed(2),
          nasa_flood_src: views.length === 2 ? "MODIS + VIIRS agree" : pickStat === w ? "VIIRS" : unconfirmed ? "MODIS only, unconfirmed" : "MODIS",
          nasa_modis_frac: m ? +m.frac.toFixed(4) : null, nasa_viirs_frac: w ? +w.frac.toFixed(4) : null });
      }
      const pp = await pixelsAround(POP, null, 7, v.lat, v.lon, 6000);   // people per km² (SEDAC GPW 2020)
      if (pp) {
        const vals = pp.map((p) => decode(p, NASA_CM.pop)).filter((x) => x != null);
        if (vals.length) {
          s.pop_density = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
          s.pop_capped = vals.filter((x) => x >= 1000).length / vals.length > 0.3;   // NASA's map stops at 1000/km²: cities are "at least"
        }
      }
      if (latest) {
        const rp = await pixelsAround(RAIN, "default", 5, v.lat, v.lon, 9000);
        if (rp) {
          let mx = 0, snow = false;
          for (const p of rp) {
            if (p[3] < 128) continue;
            if (NASA_CM.snow.some((c) => near(p, c, 2))) { snow = true; continue; }
            const val = decode(p, NASA_CM.rain); if (val != null && val > mx) mx = val;
          }
          s.nasa_rain_now = +mx.toFixed(1); s.nasa_snow = snow;
        }
        const sp = await pixelsAround(SOIL, "default", 5, v.lat, v.lon, 12000);
        if (sp) {
          const vals = sp.map((p) => decode(p, NASA_CM.soil)).filter((x) => x != null);
          if (vals.length) s.nasa_soil = +median(vals).toFixed(3);
        }
      }
      out[v.id] = s;
    }));
    return out;
  }

  /* NASA OPERA radar water (from Sentinel-1 radar, which sees through clouds and at night).
     Each pass covers part of Pakistan, so the newest of the last 3 days is used, and compared with the same 3 days
     6 weeks earlier: water that is there now but was not there then = new water. */
  function radarClass(p) {
    if (p[3] < 128) return null;
    if (near(p, NASA_CM.radar.water, 20) || near(p, NASA_CM.radar.vegwater, 20)) return "water";
    if (near(p, NASA_CM.radar.dry, 20)) return "dry";
    return null; // masked (steep terrain / shadow) or no data
  }
  async function radarComposite(v, dates) {
    const sets = await Promise.all(dates.map((d) => pixelsAround(RADAR_WATER, d, 8, v.lat, v.lon, 6000)));
    const n = (sets.find((x) => x) || []).length;
    if (!n) return null;
    const out = new Array(n).fill(null);
    for (const set of sets) {
      if (!set) continue;
      for (let i = 0; i < n; i++) if (out[i] == null) out[i] = radarClass(set[i]);
    }
    return out;
  }
  async function sampleRadar(vs) {
    const recentDates = [daysAgo(1), daysAgo(2), daysAgo(3)], baseDates = [daysAgo(43), daysAgo(44), daysAgo(45)];
    const out = {};
    await Promise.all(vs.map(async (v) => {
      const [now, base] = await Promise.all([radarComposite(v, recentDates), radarComposite(v, baseDates)]);
      if (!now) return;
      const seen = now.filter((x) => x).length, water = now.filter((x) => x === "water").length;
      const s = { radar_ok: seen > 0, radar_seen_frac: +(seen / now.length).toFixed(2), radar_water_frac: seen ? +(water / seen).toFixed(3) : null };
      if (base) {
        let both = 0, fresh = 0;
        for (let i = 0; i < now.length; i++) {
          if (!now[i] || !base[i]) continue;
          both++;
          if (now[i] === "water" && base[i] === "dry") fresh++;
        }
        if (both >= 30) Object.assign(s, { radar_new_px: fresh, radar_new_frac: +(fresh / both).toFixed(3), radar_compared_frac: +(both / now.length).toFixed(2) });
      }
      out[v.id] = s;
    }));
    return out;
  }

  // ------------------------------------------------------------ map layers (Leaflet)
  /* Radar water drawn on a canvas so only water shows (radar "not water" pixels are white and would hide the map). */
  function radarWaterLayer() {
    const Layer = L.GridLayer.extend({
      createTile(coords, done) {
        const c = document.createElement("canvas"); c.width = c.height = 256;
        tile(url(RADAR_WATER, daysAgo(1), coords.z, coords.y, coords.x)).then(async (d) => {
          if (!d) d = await tile(url(RADAR_WATER, daysAgo(2), coords.z, coords.y, coords.x));
          if (d) {
            const g = c.getContext("2d"), img = g.createImageData(256, 256);
            for (let i = 0; i < d.data.length; i += 4) {
              const p = [d.data[i], d.data[i + 1], d.data[i + 2], d.data[i + 3]];
              if (radarClass(p) === "water") { img.data[i] = 0; img.data[i + 1] = 200; img.data[i + 2] = 255; img.data[i + 3] = 220; }
            }
            g.putImageData(img, 0, 0);
          }
          done(null, c);
        });
        return c;
      }
    });
    return new Layer({ maxNativeZoom: 10, maxZoom: 18, attribution: ATTR + " · OPERA DSWx-S1 (Sentinel-1 radar)", zIndex: 345 });
  }
  const radarImageLayer = () => tileLayer(RADAR_IMAGE, daysAgo(1), { opacity: 0.8, zIndex: 300, maxNativeZoom: 10 });
  const popLayer = () => tileLayer(POP, null, { opacity: 0.55, zIndex: 310 });
  const snowLayer = () => tileLayer(SNOW, "default", { opacity: 0.6, zIndex: 315 });
  const landslideLayer = () => tileLayer(LANDSLIDE, null, { opacity: 0.6, zIndex: 318 });
  /* Flood layer drawn on a canvas so only flood water shows (NASA's grey "no data / cloud" pixels are hidden). */
  function floodLayer(date) {
    const time = !date || date === "latest" ? "default" : date;
    const layer = useViirs(date) ? FLOOD_VIIRS : FLOOD;
    const Layer = L.GridLayer.extend({
      createTile(coords, done) {
        const c = document.createElement("canvas"); c.width = c.height = 256;
        tile(url(layer, time, coords.z, coords.y, coords.x)).then((d) => {
          if (d) {
            const g = c.getContext("2d"), img = g.createImageData(256, 256);
            for (let i = 0; i < d.data.length; i += 4) {
              const p = [d.data[i], d.data[i + 1], d.data[i + 2], d.data[i + 3]];
              if (p[3] < 128) continue;
              if (near(p, NASA_CM.flood.flood)) { img.data[i] = 0; img.data[i + 1] = 92; img.data[i + 2] = 255; img.data[i + 3] = 235; }
              else if (near(p, NASA_CM.flood.recurring)) { img.data[i] = 90; img.data[i + 1] = 200; img.data[i + 2] = 255; img.data[i + 3] = 170; }
            }
            g.putImageData(img, 0, 0);
          }
          done(null, c);
        });
        return c;
      }
    });
    return new Layer({ maxNativeZoom: layer.maxZ, maxZoom: 18, attribution: ATTR + (layer === FLOOD ? " · MODIS flood product (LANCE)" : " · VIIRS flood product (LANCE)"), zIndex: 350 });
  }
  function tileLayer(layer, time, opts = {}) {
    const ext = opts.ext || "png";
    const u = time ? `${GIBS}/${layer.id}/default/${time}/${layer.tms}/{z}/{y}/{x}.${ext}` : `${GIBS}/${layer.id}/default/${layer.tms}/{z}/{y}/{x}.${ext}`;
    return L.tileLayer(u, Object.assign({ maxNativeZoom: layer.maxZ, maxZoom: 18, opacity: 0.6, attribution: ATTR, crossOrigin: true }, opts));
  }
  function rainLayer(date) {
    return !date || date === "latest" ? tileLayer(RAIN, "default", { opacity: 0.65, zIndex: 340 }) : tileLayer(RAIN_DAILY, date, { opacity: 0.65, zIndex: 340 });
  }
  const soilLayer = () => tileLayer(SOIL, "default", { opacity: 0.55, zIndex: 330 });
  const hazardLayer = () => tileLayer(HAZARD, null, { opacity: 0.6, zIndex: 320 });
  const trueColorLayer = (date) => tileLayer(TRUECOLOR, !date || date === "latest" ? yesterdayUTC() : date, { ext: "jpg", opacity: 1, zIndex: 1 });

  // ------------------------------------------------------------ EONET events
  async function events() {
    try {
      const cached = JSON.parse(sessionStorage.getItem("kh_eonet") || "null");
      if (cached && Date.now() - cached.t < 3600 * 1000) return cached.list;
    } catch (e) { /* ignore */ }
    try {
      const r = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?category=floods,severeStorms,landslides&status=all&days=365&bbox=60.5,37.5,78,23.5");
      if (!r.ok) return [];
      const j = await r.json();
      const list = [];
      for (const ev of j.events || []) {
        const g = (ev.geometry || [])[ev.geometry.length - 1]; if (!g) continue;
        let lat, lon;
        if (g.type === "Point") [lon, lat] = g.coordinates;
        else if (g.type === "Polygon") { const ring = g.coordinates[0]; lon = ring.reduce((a, p) => a + p[0], 0) / ring.length; lat = ring.reduce((a, p) => a + p[1], 0) / ring.length; }
        if (lat == null || lat < 23.5 || lat > 37.5 || lon < 60.5 || lon > 78) continue;
        list.push({ id: ev.id, title: ev.title, category: (ev.categories[0] || {}).title || "", date: g.date, lat, lon,
          link: ((ev.sources || [])[0] || {}).url || ev.link, source: ((ev.sources || [])[0] || {}).id || "EONET" });
      }
      try { sessionStorage.setItem("kh_eonet", JSON.stringify({ t: Date.now(), list })); } catch (e) { /* ignore */ }
      return list;
    } catch (e) { return []; }
  }

  /* Forget cached "latest" tiles so the next check downloads NASA's newest images. */
  function clearLatest() { for (const k of [...tiles.keys()]) if (k.includes("/default/default/")) tiles.delete(k); }

  return { REPLAYS, sampleVillages, sampleRadar, floodLayer, rainLayer, soilLayer, hazardLayer, trueColorLayer,
           radarWaterLayer, radarImageLayer, popLayer, snowLayer, landslideLayer, events, clearLatest };
})();
