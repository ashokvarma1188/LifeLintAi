/*
 * LifeLink service worker.
 *  - Offline: keeps the app shell (index.html + the hashed JS/CSS bundles) cached, so the
 *    app — and its First-Aid Guide — still opens with no connection.
 *  - Push: shows SOS alerts / SOS status updates sent by the server, even when no tab is open.
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

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "LifeLink", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      requireInteraction: Boolean(data.urgent),
      vibrate: data.urgent ? [300, 120, 300, 120, 300] : [120],
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        try {
          await existing.navigate(target);
        } catch {
          /* a tab this worker doesn't control can't be navigated — just bring it forward */
        }
        return existing.focus();
      }
      return self.clients.openWindow(target);
    })()
  );
});
