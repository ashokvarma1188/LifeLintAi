/*
 * Disaster Safety Check. An admin marks an area (centre + radius) hit by a flood,
 * cyclone, etc. Every civilian gets an "Are you safe?" notification and a banner on their
 * dashboard. Answers are "I'm safe", "I need help" or "I'm not in this area". "I need
 * help" raises an SOS to the police and fire station with the person's location, so it
 * reaches responders through the normal SOS flow.
 */
const crypto = require("crypto");
const SafetyCheck = require("../models/SafetyCheck");
const SafetyResponse = require("../models/SafetyResponse");
const EmergencyRequest = require("../models/EmergencyRequest");
const User = require("../models/User");
const { CIVILIAN_ROLES } = require("../constants/roles");
const { sendToUsers, notifyRespondersOfSos } = require("../utils/push");
const { distanceKm, readPoint } = require("../utils/geo");

const KINDS = ["flood", "cyclone", "fire", "earthquake", "heatwave", "other"];
const STATUSES = ["safe", "need_help", "not_in_area"];
const KIND_ICON = { flood: "🌊", cyclone: "🌀", fire: "🔥", earthquake: "🌍", heatwave: "🌡️", other: "⚠️" };

const civilianIds = async () =>
  (await User.find({ $or: [{ role: { $in: CIVILIAN_ROLES } }, { role: { $exists: false } }], suspended: { $ne: true } }).select("_id").lean()).map(
    (user) => user._id
  );

const countsFor = async (checkIds) => {
  const rows = await SafetyResponse.aggregate([
    { $match: { checkId: { $in: checkIds } } },
    { $group: { _id: { checkId: "$checkId", status: "$status" }, count: { $sum: 1 } } },
  ]);
  const counts = {};
  for (const id of checkIds) counts[id] = { safe: 0, need_help: 0, not_in_area: 0 };
  for (const row of rows) counts[row._id.checkId][row._id.status] = row.count;
  return counts;
};

/* ------------------------------------------------------------------ admin */

const createCheck = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim().slice(0, 120);
    const message = String(req.body?.message || "").trim().slice(0, 500);
    const kind = KINDS.includes(req.body?.kind) ? req.body.kind : "other";
    const center = readPoint(req.body);
    const radiusKm = Number(req.body?.radiusKm);
    if (!title) return res.status(400).json({ message: "Give the Safety Check a title, e.g. \"Cyclone in Vijayawada\"." });
    if (!center) return res.status(400).json({ message: "Pick the centre of the affected area on the map." });
    if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 200) {
      return res.status(400).json({ message: "The radius must be between 1 and 200 km." });
    }

    const check = await SafetyCheck.create({
      title, kind, message,
      area: { center: { type: "Point", coordinates: center }, radiusKm: Math.round(radiusKm * 10) / 10 },
      createdBy: req.userId,
    });

    sendToUsers(await civilianIds(), {
      title: `${KIND_ICON[kind]} Safety Check: ${title}`,
      body: `${message ? `${message} ` : ""}Are you safe? Tap to let your family and responders know.`,
      url: "/dashboard",
      tag: `safety-${check._id}`,
      urgent: true,
    }).catch(() => {});

    res.status(201).json({ check });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const listChecks = async (req, res) => {
  try {
    const checks = await SafetyCheck.find({}).sort({ createdAt: -1 }).limit(50).lean();
    const counts = await countsFor(checks.map((check) => check._id));
    res.json({ checks: checks.map((check) => ({ ...check, counts: counts[check._id] })) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const getCheck = async (req, res) => {
  try {
    const check = await SafetyCheck.findById(req.params.id).lean();
    if (!check) return res.status(404).json({ message: "Safety Check not found" });
    const responses = await SafetyResponse.find({ checkId: check._id })
      .populate("userId", "name phone bloodGroup")
      .sort({ updatedAt: -1 })
      .lean();
    const counts = (await countsFor([check._id]))[check._id];
    res.json({
      check: { ...check, counts },
      responses: responses.map((response) => ({
        _id: response._id,
        status: response.status,
        name: response.userId?.name || "Unknown",
        // A phone number only where someone may need to be reached.
        phone: response.status === "need_help" ? response.userId?.phone || null : null,
        coordinates: response.location?.coordinates || null,
        distanceKm: response.distanceKm ?? null,
        note: response.note || "",
        sosRequestId: response.sosRequestId || null,
        updatedAt: response.updatedAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const closeCheck = async (req, res) => {
  try {
    const check = await SafetyCheck.findOneAndUpdate(
      { _id: req.params.id, status: "active" },
      { status: "closed", closedAt: new Date() },
      { returnDocument: "after" }
    );
    if (!check) return res.status(404).json({ message: "No active Safety Check with that id" });
    res.json({ check });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/* --------------------------------------------------------------- civilians */

const listActiveForMe = async (req, res) => {
  try {
    const checks = await SafetyCheck.find({ status: "active" }).sort({ createdAt: -1 }).lean();
    const mine = await SafetyResponse.find({ checkId: { $in: checks.map((check) => check._id) }, userId: req.userId }).lean();
    res.json({
      checks: checks.map((check) => ({
        _id: check._id,
        title: check.title,
        kind: check.kind,
        message: check.message,
        center: check.area.center.coordinates,
        radiusKm: check.area.radiusKm,
        createdAt: check.createdAt,
        myResponse: mine.find((response) => String(response.checkId) === String(check._id))?.status || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const respond = async (req, res) => {
  try {
    const status = req.body?.status;
    if (!STATUSES.includes(status)) return res.status(400).json({ message: "Choose safe, need help or not in this area." });
    const check = await SafetyCheck.findOne({ _id: req.params.id, status: "active" });
    if (!check) return res.status(404).json({ message: "This Safety Check has ended." });

    const point = readPoint(req.body);
    if (status === "need_help" && !point) {
      return res.status(400).json({ message: "Your location is needed so responders can find you." });
    }

    const existing = await SafetyResponse.findOne({ checkId: check._id, userId: req.userId });
    const update = {
      status,
      note: String(req.body?.note || "").trim().slice(0, 300),
      ...(point && { location: { coordinates: point }, distanceKm: Math.round(distanceKm(point, check.area.center.coordinates) * 10) / 10 }),
    };

    // "I need help" raises one SOS per person per Safety Check.
    if (status === "need_help" && !existing?.sosRequestId) {
      const sos = await EmergencyRequest.create({
        citizenId: req.userId,
        type: check.kind === "fire" ? "fire" : "other",
        location: { type: "Point", coordinates: point },
        targets: ["police", "firestation"],
        shareToken: crypto.randomBytes(12).toString("hex"),
      });
      update.sosRequestId = sos._id;
      notifyRespondersOfSos(sos).catch(() => {});
    }

    const response = await SafetyResponse.findOneAndUpdate(
      { checkId: check._id, userId: req.userId },
      { $set: update },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ response: { status: response.status, sosRequestId: response.sosRequestId || null } });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { createCheck, listChecks, getCheck, closeCheck, listActiveForMe, respond };
