/*
 * LifeLink service worker.
 *  - Offline: keeps the app shell (index.html + its JS/CSS) cached. In the background it also
 *    saves every page's code (listed in /precache.json), so the app and its First-Aid Guide
 *    open with no connection, even pages that were never visited.
 *  - Push: shows SOS alerts / SOS status updates sent by the server, even when no tab is open.
 * API calls, map tiles and fonts are other origins and always go straight to the network.
 */
const CACHE = "lifelink-shell-v2";
const STATIC_FILES = ["/manifest.webmanifest", "/favicon.svg", "/icons/icon-192.png", "/icons/badge-96.png"];

const isHtml = (response) => response.ok && (response.headers.get("content-type") || "").includes("text/html");

// Not saved in advance: the landing page's 3D scene (~925 kB) and the PDF library with its
// helpers (~750 kB, only used online to download certificates). Both are still cached once used.
const SKIP_PRECACHE = /\/assets\/(DonationBox3D|jspdf|html2canvas|purify|index\.es)[.-]|\.(png|jpe?g|webp|svg)$/;

/**
 * Saves the code for every page in this deploy, then deletes files left over from older deploys.
 */
async function precacheAll(cache) {
  const response = await fetch("/precache.json", { cache: "no-store" });
  if (!response.ok) return;
  const files = await response.json();
  const current = new Set(files);
  await Promise.all(
    files
      .filter((url) => url.startsWith("/assets/") && !SKIP_PRECACHE.test(url))
      .map(async (url) => {
        if (!(await cache.match(url))) await cache.add(url).catch(() => {});
      })
  );
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/assets/") && !current.has(path)) await cache.delete(request);
  }
}

/**
 * Caches index.html as "/" plus every /assets/ file it references. When the files are new
 * (first install, or a new deploy), it also saves the rest of the app.
 */
async function cacheShell(cache, response, force = false) {
  const html = await response.clone().text();
  const assets = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]))];
  const newDeploy = force || (await Promise.all(assets.map((url) => cache.match(url)))).some((hit) => !hit);
  await cache.put("/", response);
  await Promise.all(assets.map((url) => cache.add(url).catch(() => {})));
  if (newDeploy) await precacheAll(cache).catch(() => {});
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch("/", { cache: "no-store" });
      if (isHtml(response)) await cacheShell(cache, response, true);
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
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cacheShell(cache, copy)).catch(() => {}));
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
  // ignoreVary: page code loaded on demand is requested with an Origin header, so a
  // "Vary: Origin" response would otherwise never match the saved copy.
  if (url.pathname.startsWith("/assets/") || STATIC_FILES.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(request, { ignoreVary: true });
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
  let data;
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
