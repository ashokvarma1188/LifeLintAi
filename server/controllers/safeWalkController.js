const crypto = require("crypto");
const mongoose = require("mongoose");
const SafeWalk = require("../models/SafeWalk");

const LIVE = ["active", "overdue"];
const MIN_MINUTES = 5;
const MAX_MINUTES = 240;

const point = (body) => {
  const longitude = Number(body?.longitude);
  const latitude = Number(body?.latitude);
  return Number.isFinite(longitude) && Number.isFinite(latitude) ? [longitude, latitude] : null;
};

const findOwn = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ message: "Walk not found" });
    return null;
  }
  const walk = await SafeWalk.findOne({ _id: req.params.id, userId: req.userId });
  if (!walk) res.status(404).json({ message: "Walk not found" });
  return walk;
};

/** Starts a walk (ending any earlier one still running). Needs the starting location. */
const startWalk = async (req, res) => {
  try {
    const minutes = Math.round(Number(req.body?.minutes));
    if (!Number.isFinite(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
      return res.status(400).json({ message: "Pick a time between 5 minutes and 4 hours." });
    }
    const coords = point(req.body);
    if (!coords) return res.status(400).json({ message: "Your location is needed to start a walk." });

    await SafeWalk.updateMany({ userId: req.userId, status: { $in: LIVE } }, { status: "cancelled", endedAt: new Date() });
    const walk = await SafeWalk.create({
      userId: req.userId,
      destination: String(req.body?.destination || "").trim().slice(0, 120),
      expectedArrival: new Date(Date.now() + minutes * 60000),
      autoSos: req.body?.autoSos !== false,
      lastLocation: { coordinates: coords, updatedAt: new Date() },
      shareToken: crypto.randomBytes(12).toString("hex"),
    });
    res.status(201).json({ walk });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** The walk still running (active or overdue), or null. Ended ones only show if they ended in the last hour. */
const getCurrentWalk = async (req, res) => {
  try {
    const walk =
      (await SafeWalk.findOne({ userId: req.userId, status: { $in: [...LIVE, "alerted"] } }).sort({ createdAt: -1 })) || null;
    res.json({ walk });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const updateLocation = async (req, res) => {
  try {
    const coords = point(req.body);
    if (!coords) return res.status(400).json({ message: "A valid latitude and longitude are required" });
    const walk = await SafeWalk.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, status: { $in: [...LIVE, "alerted"] } },
      { lastLocation: { coordinates: coords, updatedAt: new Date() } },
      { new: true }
    );
    if (!walk) return res.status(404).json({ message: "Walk not found or already ended" });
    res.json({ walk });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** More time — also clears an "overdue" state, since the person has just shown they're fine. */
const extendWalk = async (req, res) => {
  try {
    const walk = await findOwn(req, res);
    if (!walk) return;
    if (!LIVE.includes(walk.status)) return res.status(400).json({ message: "This walk has already ended." });
    const minutes = Math.min(60, Math.max(5, Math.round(Number(req.body?.minutes) || 10)));
    const base = Math.max(Date.now(), walk.expectedArrival.getTime());
    walk.expectedArrival = new Date(base + minutes * 60000);
    walk.status = "active";
    walk.overdueAt = undefined;
    await walk.save();
    res.json({ walk });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const endWalk = (status) => async (req, res) => {
  try {
    const walk = await findOwn(req, res);
    if (!walk) return;
    if (!["active", "overdue", "alerted"].includes(walk.status)) return res.status(400).json({ message: "This walk has already ended." });
    walk.status = status;
    walk.endedAt = new Date();
    await walk.save();
    res.json({ walk });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = {
  startWalk,
  getCurrentWalk,
  updateLocation,
  extendWalk,
  markArrived: endWalk("arrived"),
  cancelWalk: endWalk("cancelled"),
};
