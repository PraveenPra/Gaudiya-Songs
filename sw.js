const DEV_MODE =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1";

const CACHE_NAME = "gaudiya-songs-cache-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/categories.html",
  "/category.html",
  "/settings.html",
  "/song.html",
  "/js/app.js",
  "/js/db.js",
  "/js/song.js",
  "/js/settings.js",
  "/js/theme.js",
  "/js/utils.js",
  "/Data/data.js",
  "/Data/recommendations.js",
  "/css/styles.css",
  "/css/categories.css",
  "/css/recommendations.css",
  "/songs.json",
  "/occasions.json",
  "/favicon.svg",
  "/manifest.webmanifest",
];

// Install
self.addEventListener("install", (e) => {
  if (DEV_MODE) {
    console.log("[SW] Dev mode – skipping cache install");
    return self.skipWaiting();
  }

  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((c) => c.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate
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

// Fetch
self.addEventListener("fetch", (e) => {
  if (DEV_MODE) {
    // Dev mode: always go to network
    e.respondWith(fetch(e.request));
    return;
  }

  const req = e.request;
  if (req.method !== "GET") return;

  e.respondWith(
    (async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        if (net.ok && req.url.startsWith(self.location.origin)) {
          cache.put(req, net.clone());
        }
        return net;
      } catch {
        if (req.destination === "document") return caches.match("/index.html");
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })()
  );
});

// Listen for skipWaiting trigger from page
self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") {
    console.log("[SW] skipWaiting received, activating new SW immediately");
    self.skipWaiting();
  }
});
