/*
 * LifeLink service worker.
 *  - Offline: keeps the app shell (index.html + the hashed JS/CSS bundles) cached, so the
 *    app — and its First-Aid Guide — still opens with no connection.
 * API calls, map tiles and fonts are other origins and always go straight to the network.
 */
const CACHE = "lifelink-shell-v1";
const STATIC_FILES = ["/manifest.webmanifest", "/favicon.svg", "/icons/icon-192.png", "/icons/badge-96.png"];

const isHtml = (response) => response.ok && (response.headers.get("content-type") || "").includes("text/html");

/** Caches index.html as "/" plus every /assets/ file it references. */
async function cacheShell(cache, response) {
  const html = await response.clone().text();
  await cache.put("/", response);
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await Promise.all([...new Set(assets)].map((url) => cache.add(url).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch("/", { cache: "no-store" });
      if (isHtml(response)) await cacheShell(cache, response);
      await Promise.all(STATIC_FILES.map((url) => cache.add(url).catch(() => {})));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network first so a new deploy shows up straight away; the cached shell is the offline fallback.
  // Every route serves the same index.html, so the latest copy is kept under "/".
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (isHtml(response)) {
            const cache = await caches.open(CACHE);
            cacheShell(cache, response.clone()).catch(() => {});
          }
          return response;
        } catch {
          return (await caches.match("/")) || Response.error();
        }
      })()
    );
    return;
  }

  // Hashed bundles never change content, and the icons/manifest rarely do: cache first.
  if (url.pathname.startsWith("/assets/") || STATIC_FILES.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })()
    );
  }
});
