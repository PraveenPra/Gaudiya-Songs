const CACHE_NAME = "gaudiya-songs-cache-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/db.js",
  "/songs.json",
  "/favicon.svg",
  "/manifest.webmanifest",
];
self.addEventListener("install", (e) => {
  // Why: ensure offline right after first visit.
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((c) => c.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") {
    return;
  }
  e.respondWith(
    (async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached; // cache-first for offline
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        // Avoid caching non-OK or cross-origin opaque except JSON/CSS/JS
        if (net.ok && req.url.startsWith(self.location.origin)) {
          cache.put(req, net.clone());
        }
        return net;
      } catch {
        // offline fallback
        if (req.destination === "document") return caches.match("/index.html");
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })()
  );
});
