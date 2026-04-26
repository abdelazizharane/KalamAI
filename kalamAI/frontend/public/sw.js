// KalamAI Service Worker — enables PWA install + offline shell
const CACHE = "kalamai-v1";
const SHELL  = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Always go network-first for API / WebSocket calls
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/ws")) {
    e.respondWith(fetch(e.request));
    return;
  }
  // For navigation requests: serve cached shell so the SPA works offline
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/index.html"))
    );
    return;
  }
  // For everything else: cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
