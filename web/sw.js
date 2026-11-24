/* Khabardar offline helper: keeps a copy of the app on the phone/laptop so it still opens without internet.
   Always tries the network first (so updates arrive), and uses the saved copy only when there is no connection.
   Messages (the relay) and live data are never cached. */
const CACHE = "khabardar-v4";
const SHELL = ["./", "index.html", "phone.html", "dashboard.html", "css/phone.css", "css/dashboard.css",
  "js/config.js", "js/safepoints.js", "js/villages.js", "data/replay-2025-08-punjab.json", "js/nasa-colormaps.js", "js/common.js", "js/nasa.js", "js/phone.js",
  "js/dashboard.js", "js/dummies.js", "js/rescue.js", "vendor/leaflet.js", "vendor/leaflet.css", "vendor/qrcode.min.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null)))));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== self.location.origin || u.pathname.includes("/relay/")) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("phone.html")))
  );
});
