const crypto = require("crypto");
const mongoose = require("mongoose");
const EmergencyRequest = require("../models/EmergencyRequest");
const Hospital = require("../models/Hospital");
const User = require("../models/User");
const { redactMedicalId } = require("../utils/sosHelpers");

const VALID_TARGETS = ["hospital", "police", "firestation"];

const createSOS = async (req, res) => {
  try {
    const { longitude, latitude, type, targets, shareMedicalId } = req.body;

    const cleanTargets = Array.isArray(targets)
      ? targets.filter((t) => VALID_TARGETS.includes(t))
      : [];
    const finalTargets = cleanTargets.length ? cleanTargets : ["hospital"];

    let nearestHospital = null;
    let nearbyHospitals = [];
    if (finalTargets.includes("hospital")) {
      // No $maxDistance cap here on purpose — in a real emergency, "the nearest
      // hospital is 40km away" is far more useful than "no hospital found".
      // (Find Hospitals, the browsing page, keeps its 10km "nearby" radius —
      // this is specifically the emergency-assignment path.)
      nearestHospital = await Hospital.findOne({
        location: { $near: { $geometry: { type: "Point", coordinates: [longitude, latitude] } } },
      });

      // A few more options (nearest first) so the civilian can see which have beds free right now.
      nearbyHospitals = await Hospital.find({
        location: { $near: { $geometry: { type: "Point", coordinates: [longitude, latitude] } } },
      })
        .limit(4)
        .select("name address phone availableBeds icuAvailableBeds ambulanceAvailable location");
    }

    const emergencyRequest = await EmergencyRequest.create({
      citizenId: req.userId,
      type: type || "medical",
      location: { type: "Point", coordinates: [longitude, latitude] },
      assignedHospitalId: nearestHospital ? nearestHospital._id : null,
      targets: finalTargets,
      shareMedicalId: Boolean(shareMedicalId),
      shareToken: crypto.randomBytes(12).toString("hex"),
    });

    res.status(201).json({
      message: "SOS request created successfully",
      emergencyRequest,
      nearbyHospitals,
      nearestHospital: finalTargets.includes("hospital")
        ? nearestHospital || "No hospital is registered on the platform yet"
        : "Hospital was not alerted for this request",
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const DEFAULT_SERVICE_RADIUS_KM = 25;

/**
 * Only requests where the civilian chose to alert Hospital, scoped to this
 * hospital's own service radius once it has claimed a Hospital record (via
 * Bed Availability). Accounts that haven't claimed one yet still see every
 * hospital-targeted request, same as before — there's no location to scope by.
 */
const listSOS = async (req, res) => {
  try {
    const myHospital = await Hospital.findOne({ ownerId: req.user._id });
    const filter = { targets: "hospital" };

    if (myHospital) {
      const radiusKm = req.user.serviceRadiusKm || DEFAULT_SERVICE_RADIUS_KM;
      filter.location = {
        $near: { $geometry: myHospital.location, $maxDistance: radiusKm * 1000 },
      };
    }

    const requests = await EmergencyRequest.find(filter)
      .populate("citizenId", "name phone bloodGroup allergies medicalHistory")
      .populate("assignedHospitalId", "name")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ requests: requests.map(redactMedicalId) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** A civilian's own SOS history, newest first. */
const myRequests = async (req, res) => {
  try {
    const requests = await EmergencyRequest.find({ citizenId: req.userId })
      .populate("assignedHospitalId", "name phone address")
      .populate("respondedBy", "name orgName phone")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const CANCEL_REASONS = ["safe_now", "sent_by_mistake", "other"];

/** Only the citizen who raised it can cancel, and only while it's still pending. */
const cancelSOS = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Request not found" });
    }

    const request = await EmergencyRequest.findOne({ _id: id, citizenId: req.userId });
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "This request has already been responded to and can no longer be cancelled" });
    }

    request.status = "cancelled";
    if (CANCEL_REASONS.includes(req.body.reason)) {
      request.cancelReason = req.body.reason;
    }
    await request.save();

    res.json({ message: "SOS request cancelled", request });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Live location updates while an alert is still active — civilian-owned, pending/accepted only. */
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Request not found" });
    }

    const longitude = Number(req.body.longitude);
    const latitude = Number(req.body.latitude);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return res.status(400).json({ message: "A valid latitude and longitude are required" });
    }

    const request = await EmergencyRequest.findOneAndUpdate(
      { _id: id, citizenId: req.userId, status: { $in: ["pending", "accepted", "en_route"] } },
      { location: { type: "Point", coordinates: [longitude, latitude] } },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found or no longer active" });
    }

    res.json({ request });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const RESPONDER_ROLES = ["hospital", "police", "firestation"];

// What status(es) a request must already be in for each transition to be
// valid — enforced atomically below so two responders racing to act on the
// same request can't both "win", and a resolved/declined request can't be
// silently flipped back. "en_route" is optional — a responder can resolve
// straight from "accepted" without ever marking en route.
const REQUIRED_PRIOR_STATUS = {
  accepted: ["pending"],
  declined: ["pending"],
  en_route: ["accepted"],
  resolved: ["accepted", "en_route"],
};

/**
 * Any of Hospital/Police/Fire Station can act on a request, but only one
 * targeted at their own service — a fire station can't accept a
 * hospital-only alert just because it happens to see it somewhere.
 *
 * The find-and-update is a single atomic operation filtered on the prior
 * status: if two responders race to accept the same request, only the first
 * `findOneAndUpdate` actually matches (the second sees the now-changed
 * status and gets a clean 409, instead of silently overwriting the first).
 */
const setStatus = (status) => async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (!RESPONDER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Only response services can update a request" });
    }

    const update = {
      status,
      respondedBy: req.user._id,
      respondedByRole: req.user.role,
    };
    if (status === "accepted" && req.body.etaMinutes !== undefined) {
      const eta = Number(req.body.etaMinutes);
      if (Number.isFinite(eta) && eta >= 0) update.etaMinutes = eta;
    }
    if (status === "resolved" && req.body.falseAlarm !== undefined) {
      update.falseAlarm = Boolean(req.body.falseAlarm);
    }

    const request = await EmergencyRequest.findOneAndUpdate(
      { _id: id, targets: req.user.role, status: { $in: REQUIRED_PRIOR_STATUS[status] } },
      update,
      { new: true }
    ).populate([
      { path: "citizenId", select: "name phone bloodGroup allergies medicalHistory" },
      { path: "assignedHospitalId", select: "name" },
      { path: "respondedBy", select: "name orgName" },
    ]);

    if (!request) {
      const stillExists = await EmergencyRequest.exists({ _id: id, targets: req.user.role });
      return res.status(stillExists ? 409 : 404).json({
        message: stillExists
          ? "This request was already updated by someone else — refresh and try again."
          : "Request not found",
      });
    }

    res.json({ message: `Request marked as ${status}`, request: redactMedicalId(request) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/**
 * A responder shares where they are right now. One call updates every active
 * (accepted / en route) request handled by their organisation — the owner plus
 * any staff accounts — so the client never has to work out which alerts are "theirs".
 */
const updateResponderLocation = async (req, res) => {
  try {
    if (!RESPONDER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Only response services can share a responder location" });
    }

    const longitude = Number(req.body.longitude);
    const latitude = Number(req.body.latitude);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return res.status(400).json({ message: "A valid latitude and longitude are required" });
    }

    const orgRootId = req.user.parentOrgId || req.user._id;
    const orgUserIds = await User.find({ $or: [{ _id: orgRootId }, { parentOrgId: orgRootId }] }).distinct("_id");

    const result = await EmergencyRequest.updateMany(
      { respondedBy: { $in: orgUserIds }, status: { $in: ["accepted", "en_route"] } },
      { $set: { "responderLocation.coordinates": [longitude, latitude], "responderLocation.updatedAt": new Date() } }
    );

    res.json({ updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** A responder's own stats — covers the org owner plus any staff accounts under it, not just one login. */
const getMyAnalytics = async (req, res) => {
  try {
    if (!RESPONDER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Only response services have analytics" });
    }

    const orgRootId = req.user.parentOrgId || req.user._id;
    const orgUserIds = await User.find({ $or: [{ _id: orgRootId }, { parentOrgId: orgRootId }] }).distinct("_id");

    const byStatus = await EmergencyRequest.aggregate([
      { $match: { respondedBy: { $in: orgUserIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusMap = { accepted: 0, resolved: 0, declined: 0 };
    byStatus.forEach(({ _id, count }) => {
      statusMap[_id] = count;
    });
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);

    const falseAlarmCount = await EmergencyRequest.countDocuments({
      respondedBy: { $in: orgUserIds },
      status: "resolved",
      falseAlarm: true,
    });

    const acceptTimes = await EmergencyRequest.aggregate([
      { $match: { respondedBy: { $in: orgUserIds }, status: { $in: ["accepted", "resolved"] } } },
      { $project: { acceptMinutes: { $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 60000] } } },
      { $group: { _id: null, avgAcceptMinutes: { $avg: "$acceptMinutes" } } },
    ]);

    res.json({
      total,
      byStatus: statusMap,
      falseAlarmCount,
      falseAlarmRate: total ? Math.round((falseAlarmCount / total) * 1000) / 10 : 0,
      avgAcceptMinutes: acceptTimes[0]?.avgAcceptMinutes ? Math.round(acceptTimes[0].avgAcceptMinutes * 10) / 10 : null,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = {
  createSOS,
  listSOS,
  myRequests,
  cancelSOS,
  updateLocation,
  updateResponderLocation,
  getMyAnalytics,
  acceptSOS: setStatus("accepted"),
  declineSOS: setStatus("declined"),
  enRouteSOS: setStatus("en_route"),
  resolveSOS: setStatus("resolved"),
};
