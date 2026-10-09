const PushSubscription = require("../models/PushSubscription");
const { isEnabled, publicKey, sendToUsers } = require("../utils/push");

// Only real browser push services — the server POSTs to whatever endpoint is stored,
// so arbitrary URLs must never be accepted.
const PUSH_SERVICE_HOSTS = ["googleapis.com", "mozilla.com", "push.apple.com", "notify.windows.com"];
const isPushServiceUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && PUSH_SERVICE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};

const getPublicKey = (req, res) => {
  res.json({ enabled: isEnabled(), publicKey: publicKey() });
};

/** Saves (or re-assigns to this user) the browser's push subscription. */
const subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body || {};
    if (!isPushServiceUrl(endpoint) || typeof keys?.p256dh !== "string" || typeof keys?.auth !== "string") {
      return res.status(400).json({ message: "Invalid push subscription" });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { userId: req.userId, keys: { p256dh: keys.p256dh, auth: keys.auth } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: "Notifications turned on for this device" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (typeof endpoint !== "string") return res.status(400).json({ message: "Endpoint is required" });
    await PushSubscription.deleteOne({ endpoint, userId: req.userId });
    res.json({ message: "Notifications turned off for this device" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Lets someone check their device really receives notifications. */
const sendTest = async (req, res) => {
  try {
    const sent = await sendToUsers([req.userId], {
      title: "LifeLink notifications are on ✅",
      body: "This is how SOS alerts and updates will reach you.",
      url: "/dashboard",
      tag: "lifelink-test",
    });
    if (!sent) return res.status(404).json({ message: "No device with notifications turned on was found." });
    res.json({ sent });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { getPublicKey, subscribe, unsubscribe, sendTest };
