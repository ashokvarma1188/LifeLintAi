import api from "./api";

/*
 * Browser push notifications. The service worker (public/sw.js) is only registered in
 * production builds — Vite's dev server and a caching worker don't mix — so push is
 * treated as unsupported in development.
 */
export const pushSupported = () =>
  import.meta.env.PROD && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline mode and push just stay unavailable */
    });
  });
}

const base64UrlToBytes = (value) => {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

const sameKey = (subscription, publicKey) => {
  const current = subscription.options?.applicationServerKey;
  if (!current) return true;
  const a = new Uint8Array(current);
  const b = base64UrlToBytes(publicKey);
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
};

export async function getPushConfig() {
  const { data } = await api.get("/push/public-key");
  return data;
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

/** Subscribes this browser (re-subscribing if the server's key changed) and stores it for the signed-in user. */
async function subscribeAndSave(publicKey) {
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !sameKey(subscription, publicKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(publicKey),
    });
  }
  await api.post("/push/subscribe", subscription.toJSON());
  return subscription;
}

export async function enablePush() {
  const { enabled, publicKey } = await getPushConfig();
  if (!enabled) throw new Error("Notifications aren't available on the server right now.");

  const permission = await Notification.requestPermission();
  if (permission === "denied") {
    throw new Error("Notifications are blocked for this site. Allow them from the lock icon in the address bar, then try again.");
  }
  if (permission !== "granted") throw new Error("Notifications were not allowed.");
  return subscribeAndSave(publicKey);
}

export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await api.delete("/push/subscribe", { data: { endpoint: subscription.endpoint } }).catch(() => {});
  await subscription.unsubscribe();
}

export async function sendTestPush() {
  const { data } = await api.post("/push/test");
  return data;
}

/** On app load: keeps the server's copy of this device's subscription current (new login, rotated key…). */
export async function syncPushSubscription() {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    const { enabled, publicKey } = await getPushConfig();
    if (enabled && (await currentSubscription())) await subscribeAndSave(publicKey);
  } catch {
    /* best effort — the toggle on the dashboard shows the real state */
  }
}

/** Called before signing out, so this device stops getting that account's alerts. */
export async function unlinkPushOnLogout() {
  try {
    const subscription = await currentSubscription();
    if (subscription) {
      await Promise.race([
        api.delete("/push/subscribe", { data: { endpoint: subscription.endpoint } }),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
  } catch {
    /* signing out must never be blocked by this */
  }
}
