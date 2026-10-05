const mongoose = require("mongoose");
const BloodRequest = require("../models/BloodRequest");
const { BLOOD_GROUPS, compatibleDonorGroups } = require("../utils/bloodCompatibility");

// Haversine formula: straight-line distance (km) between two lat/lng points.
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const summarize = (request, fromCoords) => {
  let distanceKmFromDonor = null;
  if (fromCoords && request.location?.coordinates?.length === 2) {
    const [lng, lat] = request.location.coordinates;
    distanceKmFromDonor = Math.round(distanceKm(fromCoords.latitude, fromCoords.longitude, lat, lng) * 10) / 10;
  }

  return {
    _id: request._id,
    requestedBy: request.requestedBy,
    bloodGroup: request.bloodGroup,
    unitsNeeded: request.unitsNeeded,
    notes: request.notes,
    status: request.status,
    responses: request.responses,
    acceptedCount: request.responses.filter((r) => r.status === "accepted").length,
    distanceKm: distanceKmFromDonor,
    createdAt: request.createdAt,
  };
};

const createRequest = async (req, res) => {
  try {
    const bloodGroup = String(req.body.bloodGroup || "").toUpperCase();
    if (!BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ message: "A valid blood group is required" });
    }

    const unitsNeeded = Number(req.body.unitsNeeded) || 1;

    const longitude = Number(req.body.longitude);
    const latitude = Number(req.body.latitude);
    const hasLocation = Number.isFinite(longitude) && Number.isFinite(latitude);

    const request = await BloodRequest.create({
      requestedBy: req.user._id,
      bloodGroup,
      unitsNeeded: unitsNeeded >= 1 ? unitsNeeded : 1,
      notes: String(req.body.notes || "").trim(),
      location: hasLocation ? { type: "Point", coordinates: [longitude, latitude] } : undefined,
    });

    res.status(201).json({ message: "Blood request posted", request: summarize(request) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/**
 * Open requests this donor is compatible with, hasn't responded to yet, and
 * didn't raise themselves — nearest first when the donor shares their
 * current location, same as every other "nearest" feature in the app.
 * Requests with no location (or a donor who declined location) just keep
 * the newest-first order, placed after any distance-sorted ones.
 */
const listForDonor = async (req, res) => {
  try {
    if (!req.user.donorAvailable || !req.user.bloodGroup) {
      return res.json({ requests: [] });
    }

    const requests = await BloodRequest.find({
      status: "open",
      requestedBy: { $ne: req.user._id },
      "responses.donorId": { $ne: req.user._id },
    })
      .populate("requestedBy", "name phone")
      .sort({ createdAt: -1 });

    const compatible = requests.filter((r) => compatibleDonorGroups(r.bloodGroup).includes(req.user.bloodGroup));

    const longitude = Number(req.query.longitude);
    const latitude = Number(req.query.latitude);
    const fromCoords = Number.isFinite(longitude) && Number.isFinite(latitude) ? { latitude, longitude } : null;

    const summarized = compatible.map((r) => summarize(r, fromCoords));
    if (fromCoords) {
      summarized.sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    res.json({ requests: summarized });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** The civilian's own requests, with who's accepted/declined so far. */
const myRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find({ requestedBy: req.user._id })
      .populate("responses.donorId", "name phone bloodGroup")
      .sort({ createdAt: -1 });

    res.json({ requests: requests.map(summarize) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** A donor accepts or declines — only once per donor per request, only while compatible and still open. */
const respond = async (req, res) => {
  try {
    const { id } = req.params;
    const status = req.body.status === "accepted" ? "accepted" : "declined";

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (!req.user.bloodGroup) {
      return res.status(400).json({ message: "Set your blood group in your profile first" });
    }

    const request = await BloodRequest.findOne({ _id: id, status: "open" });
    if (!request) {
      return res.status(404).json({ message: "Request not found or no longer open" });
    }
    if (String(request.requestedBy) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't respond to your own request" });
    }
    if (!compatibleDonorGroups(request.bloodGroup).includes(req.user.bloodGroup)) {
      return res.status(403).json({ message: "Your blood group isn't compatible with this request" });
    }
    if (request.responses.some((r) => String(r.donorId) === String(req.user._id))) {
      return res.status(400).json({ message: "You've already responded to this request" });
    }

    request.responses.push({ donorId: req.user._id, status });
    await request.save();

    res.json({ message: `Marked as ${status}`, request: summarize(request) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Only the requester can close it out — fulfilled (got enough donors) or cancelled (no longer needed). */
const setStatus = (status) => async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Request not found" });
    }

    const request = await BloodRequest.findOneAndUpdate(
      { _id: id, requestedBy: req.user._id, status: "open" },
      { status },
      { new: true }
    );
    if (!request) {
      return res.status(404).json({ message: "Request not found or already closed" });
    }

    res.json({ message: `Request marked as ${status}`, request: summarize(request) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = {
  createRequest,
  listForDonor,
  myRequests,
  respond,
  fulfilRequest: setStatus("fulfilled"),
  cancelRequest: setStatus("cancelled"),
};
