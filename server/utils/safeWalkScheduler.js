/*
 * Watches running "Walk with me" trips once a minute:
 *  1. past the expected arrival → overdue, and the walker gets an "Are you safe?" push;
 *  2. still overdue after the grace period and they opted in → an SOS goes to the police
 *     with their last known location (and nearby police get the usual SOS push).
 */
const crypto = require("crypto");
const SafeWalk = require("../models/SafeWalk");
const EmergencyRequest = require("../models/EmergencyRequest");
const { sendToUsers, notifyRespondersOfSos } = require("./push");

const CHECK_MS = 60 * 1000;
const GRACE_MS = 5 * 60 * 1000;

async function checkWalks(now = new Date()) {
  const result = { overdue: 0, alerted: 0 };

  const late = await SafeWalk.find({ status: "active", expectedArrival: { $lt: now } });
  for (const walk of late) {
    const claimed = await SafeWalk.updateOne({ _id: walk._id, status: "active" }, { status: "overdue", overdueAt: now });
    if (!claimed.modifiedCount) continue;
    result.overdue += 1;
    await sendToUsers([walk.userId], {
      title: "⏰ Are you safe?",
      body: walk.autoSos
        ? "You haven't checked in. Tap \"I've arrived\" within 5 minutes, or the police will be alerted."
        : "You haven't checked in from your walk. Tap to confirm you've arrived.",
      url: "/walk",
      tag: `walk-${walk._id}`,
      urgent: true,
    }).catch(() => {});
  }

  const expired = await SafeWalk.find({
    status: "overdue",
    autoSos: true,
    overdueAt: { $lt: new Date(now.getTime() - GRACE_MS) },
    "lastLocation.coordinates.1": { $exists: true },
  });
  for (const walk of expired) {
    const claimed = await SafeWalk.updateOne({ _id: walk._id, status: "overdue" }, { status: "alerted" });
    if (!claimed.modifiedCount) continue;
    const request = await EmergencyRequest.create({
      citizenId: walk.userId,
      type: "safety",
      location: { type: "Point", coordinates: walk.lastLocation.coordinates },
      targets: ["police"],
      shareToken: crypto.randomBytes(12).toString("hex"),
    });
    await SafeWalk.updateOne({ _id: walk._id }, { sosRequestId: request._id });
    result.alerted += 1;
    notifyRespondersOfSos(request).catch(() => {});
    await sendToUsers([walk.userId], {
      title: "🚨 Police alerted",
      body: "You didn't check in from your walk, so an SOS with your last location was sent to the police.",
      url: "/sos-history",
      tag: `walk-${walk._id}`,
      urgent: true,
    }).catch(() => {});
  }
  return result;
}

function startSafeWalkScheduler() {
  const tick = () => checkWalks().catch((err) => console.error("Walk check failed:", err.message));
  setTimeout(() => {
    tick();
    setInterval(tick, CHECK_MS);
  }, CHECK_MS - (Date.now() % CHECK_MS) + 5000);
}

module.exports = { startSafeWalkScheduler, checkWalks, GRACE_MS };
