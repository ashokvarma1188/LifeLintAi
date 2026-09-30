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

/**
 * Only requests where the civilian chose to alert Hospital. There is no link
 * between a Hospital document and the hospital User accounts that manage it,
 * so requests can't be scoped to "my hospital" yet — every hospital account
 * sees every hospital-targeted request.
 */
const listSOS = async (req, res) => {
  try {
    const requests = await EmergencyRequest.find({ targets: "hospital" })
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

/**
 * Any of Hospital/Police/Fire Station can act on a request, but only one
 * targeted at their own service — a fire station can't accept a
 * hospital-only alert just because it happens to see it somewhere.
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

    const request = await EmergencyRequest.findOne({ _id: id, targets: req.user.role });
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = status;
    request.respondedBy = req.user._id;
    request.respondedByRole = req.user.role;
    if (status === "accepted" && req.body.etaMinutes !== undefined) {
      const eta = Number(req.body.etaMinutes);
      if (Number.isFinite(eta) && eta >= 0) request.etaMinutes = eta;
    }
    await request.save();
    await request.populate([
      { path: "citizenId", select: "name phone bloodGroup" },
      { path: "assignedHospitalId", select: "name" },
      { path: "respondedBy", select: "name orgName" },
    ]);

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
