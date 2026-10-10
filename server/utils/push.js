/*
 * Web Push (the browser's own notification channel — no Firebase project needed).
 *
 * VAPID keys identify this server to the browsers' push services. Set
 * VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY to use your own pair; otherwise a pair
 * is derived deterministically from JWT_SECRET (HKDF), so push works on every
 * deploy with no extra setup and stays stable across restarts.
 */
const crypto = require("crypto");
const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");
const User = require("../models/User");
const Hospital = require("../models/Hospital");
const { distanceKm } = require("./geo");

const DEFAULT_SERVICE_RADIUS_KM = 25; // same default the alert inboxes use
const RESPONDER_PAGE = { hospital: "/hospital/incoming", police: "/police/alerts", firestation: "/firestation/alerts" };
const TYPE_LABEL = { medical: "Medical emergency", fire: "Fire", accident: "Accident", safety: "Safety / crime", other: "Emergency" };

const deriveKeys = () => {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  if (!process.env.JWT_SECRET) return null;

  // A P-256 private key is any 32-byte value below the curve order; retry on the (astronomically rare) miss.
  for (let attempt = 0; attempt < 5; attempt++) {
    const seed = Buffer.from(crypto.hkdfSync("sha256", process.env.JWT_SECRET, "lifelink-web-push", `vapid-key-${attempt}`, 32));
    try {
      const ecdh = crypto.createECDH("prime256v1");
      ecdh.setPrivateKey(seed);
      return { publicKey: ecdh.getPublicKey().toString("base64url"), privateKey: seed.toString("base64url") };
    } catch {
      /* out of range — try the next derivation */
    }
  }
  return null;
};

// DISABLE_PUSH=true turns sending off, e.g. on a developer machine that shares the real database.
const keys = process.env.DISABLE_PUSH === "true" ? null : deriveKeys();
if (keys) {
  const subject = process.env.VAPID_SUBJECT || `${(process.env.CLIENT_URL || "https://lifelinkai-app.vercel.app").split(",")[0].trim()}`;
  webpush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
}

const isEnabled = () => Boolean(keys);
const publicKey = () => keys?.publicKey || null;

/** Sends one payload to every device of the given users; prunes subscriptions the push service says are gone. */
const sendToUsers = async (userIds, payload) => {
  if (!keys || userIds.length === 0) return 0;
  const subs = await PushSubscription.find({ userId: { $in: userIds } });
  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, {
          TTL: payload.urgent ? 600 : 3600,
          urgency: payload.urgent ? "high" : "normal",
        });
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) await sub.deleteOne();
        else console.error("Push failed:", err.statusCode || err.message);
      }
    })
  );
  return sent;
};


/**
 * New SOS → every subscribed responder who would see it in their own inbox. Mirrors the
 * inbox rules exactly: police/fire by their own location + service radius, hospitals by
 * their claimed Hospital record's location; accounts without a location see every alert.
 */
const notifyRespondersOfSos = async (request) => {
  if (!keys) return;
  const subscribedIds = await PushSubscription.distinct("userId");
  if (subscribedIds.length === 0) return;

  const candidates = await User.find({
    _id: { $in: subscribedIds },
    role: { $in: request.targets },
    roleStatus: "approved",
    suspended: { $ne: true },
  }).select("role location serviceRadiusKm");

  const sosPoint = request.location.coordinates;
  const hospitals = await Hospital.find({ ownerId: { $in: candidates.filter((u) => u.role === "hospital").map((u) => u._id) } }).select(
    "ownerId location"
  );
  const hospitalByOwner = new Map(hospitals.map((h) => [String(h.ownerId), h]));

  await Promise.all(
    candidates.map((user) => {
      const base = user.role === "hospital" ? hospitalByOwner.get(String(user._id))?.location : user.location;
      let km = null;
      if (base?.coordinates?.length === 2) {
        km = distanceKm(base.coordinates, sosPoint);
        if (km > (user.serviceRadiusKm || DEFAULT_SERVICE_RADIUS_KM)) return null;
      }
      return sendToUsers([user._id], {
        title: `🚨 New SOS — ${TYPE_LABEL[request.type] || "Emergency"}`,
        body: `${km !== null ? `${km < 1 ? "Under 1" : km.toFixed(1)} km from you. ` : ""}Tap to open your alerts and respond.`,
        url: RESPONDER_PAGE[user.role],
        tag: `sos-${request._id}`,
        urgent: true,
      });
    })
  );
};

const STATUS_MESSAGE = {
  accepted: (who) => ({ title: "✅ Your SOS was accepted", body: `${who} has accepted your alert and is getting ready.` }),
  en_route: (who) => ({ title: "🚑 Help is on the way", body: `${who} is on the way. Open LifeLink to follow them live.` }),
  resolved: () => ({ title: "Your SOS was marked resolved", body: "We hope you're safe. Thank you for using LifeLink." }),
};

/** Tells the civilian who raised an SOS when a responder accepts, sets off, or resolves it. */
const notifyCitizenOfStatus = async (request) => {
  const build = STATUS_MESSAGE[request.status];
  if (!keys || !build) return;
  const who = request.respondedBy?.orgName || request.respondedBy?.name || "A response team";
  await sendToUsers([request.citizenId?._id || request.citizenId], {
    ...build(who),
    url: "/sos-history",
    tag: `sos-status-${request._id}`,
    urgent: request.status !== "resolved",
  });
};

module.exports = { isEnabled, publicKey, sendToUsers, notifyRespondersOfSos, notifyCitizenOfStatus };
