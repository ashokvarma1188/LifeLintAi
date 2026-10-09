/*
 * The service worker (public/sw.js) keeps the app shell cached for offline use. It is only
 * registered in production builds — Vite's dev server and a caching worker don't mix.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline mode just stays unavailable */
    });
  });
}
