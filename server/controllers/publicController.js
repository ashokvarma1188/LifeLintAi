const User = require("../models/User");
const Hospital = require("../models/Hospital");
const EmergencyRequest = require("../models/EmergencyRequest");

/**
 * Real, live counts for the landing page's "network" section — no auth
 * required, and nothing here is sensitive (just how many of each org type
 * are approved, plus a handful of names already meant to be public-facing).
 */
const getNetworkStats = async (req, res) => {
  try {
    const [hospitalCount, policeCount, firestationCount, pharmacyCount, hospitalNames] = await Promise.all([
      Hospital.countDocuments({}),
      User.countDocuments({ role: "police", roleStatus: "approved" }),
      User.countDocuments({ role: "firestation", roleStatus: "approved" }),
      User.countDocuments({ role: "pharmacy", roleStatus: "approved" }),
      Hospital.find({}).select("name").sort({ availableBeds: -1 }).limit(8),
    ]);

    res.json({
      counts: {
        hospitals: hospitalCount,
        police: policeCount,
        firestation: firestationCount,
        pharmacy: pharmacyCount,
      },
      hospitalNames: hospitalNames.map((h) => h.name),
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const TOKEN_PATTERN = /^[a-f0-9]{16,64}$/;

/**
 * The page a civilian's family opens from the link in their SOS message. The token is the
 * only credential (unguessable, one per alert), and only what a worried relative needs is
 * returned: a first name, the situation, status and positions — never phone/medical data.
 * Once the alert is over the live positions are dropped.
 */
const getTrackByToken = async (req, res) => {
  try {
    if (!TOKEN_PATTERN.test(req.params.token)) return res.status(404).json({ message: "Link not found" });

    const request = await EmergencyRequest.findOne({ shareToken: req.params.token })
      .populate("citizenId", "name")
      .populate("respondedBy", "name orgName");
    if (!request) return res.status(404).json({ message: "Link not found" });

    const live = ["pending", "accepted", "en_route"].includes(request.status);
    res.json({
      firstName: (request.citizenId?.name || "Someone").split(" ")[0],
      type: request.type,
      status: request.status,
      raisedAt: request.createdAt,
      updatedAt: request.updatedAt,
      location: live ? request.location?.coordinates : null,
      responderLocation: live ? request.responderLocation?.coordinates || null : null,
      responderRole: request.respondedByRole || null,
      responderName: request.respondedBy?.orgName || request.respondedBy?.name || null,
      etaMinutes: request.etaMinutes ?? null,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { getNetworkStats, getTrackByToken };
