const mongoose = require("mongoose");
const EmergencyRequest = require("../models/EmergencyRequest");
const Hospital = require("../models/Hospital");

const VALID_TARGETS = ["hospital", "police", "firestation"];

const createSOS = async (req, res) => {
  try {
    const { longitude, latitude, type, targets } = req.body;

    const cleanTargets = Array.isArray(targets)
      ? targets.filter((t) => VALID_TARGETS.includes(t))
      : [];
    const finalTargets = cleanTargets.length ? cleanTargets : ["hospital"];

    let nearestHospital = null;
    if (finalTargets.includes("hospital")) {
      nearestHospital = await Hospital.findOne({
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [longitude, latitude] },
            $maxDistance: 10000,
          },
        },
      });
    }

    const emergencyRequest = await EmergencyRequest.create({
      citizenId: req.userId,
      type: type || "medical",
      location: { type: "Point", coordinates: [longitude, latitude] },
      assignedHospitalId: nearestHospital ? nearestHospital._id : null,
      targets: finalTargets,
    });

    res.status(201).json({
      message: "SOS request created successfully",
      emergencyRequest,
      nearestHospital: finalTargets.includes("hospital")
        ? nearestHospital || "No hospital found within 10km"
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
      .populate("citizenId", "name phone bloodGroup")
      .populate("assignedHospitalId", "name")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** A civilian's own SOS history, newest first. */
const myRequests = async (req, res) => {
  try {
    const requests = await EmergencyRequest.find({ citizenId: req.userId })
      .populate("assignedHospitalId", "name phone address")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

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
    await request.save();

    res.json({ message: "SOS request cancelled", request });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const RESPONDER_ROLES = ["hospital", "police", "firestation"];

// What status a request must already be in for each transition to be valid —
// enforced atomically below so two responders racing to act on the same
// request can't both "win", and a resolved/declined request can't be
// silently flipped back.
const REQUIRED_PRIOR_STATUS = { accepted: "pending", declined: "pending", resolved: "accepted" };

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

    const request = await EmergencyRequest.findOneAndUpdate(
      { _id: id, targets: req.user.role, status: REQUIRED_PRIOR_STATUS[status] },
      update,
      { new: true }
    ).populate([
      { path: "citizenId", select: "name phone bloodGroup" },
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

    res.json({ message: `Request marked as ${status}`, request });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = {
  createSOS,
  listSOS,
  myRequests,
  cancelSOS,
  acceptSOS: setStatus("accepted"),
  declineSOS: setStatus("declined"),
  resolveSOS: setStatus("resolved"),
};
