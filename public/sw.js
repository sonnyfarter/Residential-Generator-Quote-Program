// Offline shell. Network-first for navigations so deploys reach users
// immediately; cache-first for hashed/static assets (their URLs change per
// build, so they're safe to cache forever). Bump CACHE on each deploy.
const CACHE = "standby-v2";
const SHELL = ["/", "/setup", "/gas", "/quote", "/takeoff", "/reports", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Never touch API calls.
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  // Network-first for navigations (HTML) so a new deploy is picked up at once;
  // fall back to cache (then "/") when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match("/")))
    );
    return;
  }

  // Cache-first for everything else (content-hashed /_next/static, icons, etc.).
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
