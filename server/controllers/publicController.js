const User = require("../models/User");
const Hospital = require("../models/Hospital");
const EmergencyRequest = require("../models/EmergencyRequest");
const SafeWalk = require("../models/SafeWalk");
const { DEMO_EMAIL } = require("../utils/demo");

/**
 * Real, live counts for the landing page (network and impact sections). No auth needed and
 * nothing sensitive: totals only, plus a few hospital names that are public anyway.
 * Demo accounts and their data are left out, so the numbers are the real network.
 */
const getNetworkStats = async (req, res) => {
  try {
    const demoIds = await User.find({ email: DEMO_EMAIL }).distinct("_id");
    const realOrg = (role) => ({ role, roleStatus: "approved", email: { $not: DEMO_EMAIL } });
    const realHospital = { ownerId: { $nin: demoIds } };

    const [hospitalCount, policeCount, firestationCount, pharmacyCount, hospitalNames, sosResolved, donors, stock] = await Promise.all([
      Hospital.countDocuments(realHospital),
      User.countDocuments(realOrg("police")),
      User.countDocuments(realOrg("firestation")),
      User.countDocuments(realOrg("pharmacy")),
      Hospital.find(realHospital).select("name").sort({ availableBeds: -1 }).limit(8),
      EmergencyRequest.countDocuments({ status: "resolved", demo: { $ne: true } }),
      User.countDocuments({ email: { $not: DEMO_EMAIL }, $or: [{ donorAvailable: true }, { donationCount: { $gt: 0 } }] }),
      Hospital.aggregate([
        { $match: realHospital },
        { $project: { units: { $objectToArray: { $ifNull: ["$bloodStock", {}] } } } },
        { $unwind: "$units" },
        { $group: { _id: null, total: { $sum: "$units.v" } } },
      ]),
    ]);

    res.json({
      counts: {
        hospitals: hospitalCount,
        police: policeCount,
        firestation: firestationCount,
        pharmacy: pharmacyCount,
      },
      impact: {
        hospitals: hospitalCount,
        responders: policeCount + firestationCount,
        sosResolved,
        donors,
        bloodUnits: stock[0]?.total || 0,
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

/**
 * What a responder sees after scanning someone's Medical ID QR code. Only exists
 * once the owner switched it on, and only holds emergency-relevant facts.
 */
const getMedicalIdByToken = async (req, res) => {
  try {
    if (!TOKEN_PATTERN.test(req.params.token)) return res.status(404).json({ message: "Medical ID not found" });

    const user = await User.findOne({ medicalIdToken: req.params.token }).select(
      "name age bloodGroup allergies medicalHistory emergencyContacts organPledge"
    );
    if (!user) return res.status(404).json({ message: "Medical ID not found" });

    res.json({
      name: user.name,
      age: user.age ?? null,
      bloodGroup: user.bloodGroup || null,
      allergies: user.allergies || [],
      medicalHistory: user.medicalHistory || [],
      emergencyContacts: (user.emergencyContacts || []).map((c) => ({ name: c.name, phone: c.phone, relation: c.relation })),
      organDonor: user.organPledge?.pledged ? user.organPledge.organs : null,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/**
 * The page family members follow during a "Walk with me" trip: first name, destination,
 * status and last position (hidden again once the walk is over).
 */
const getWalkByToken = async (req, res) => {
  try {
    if (!TOKEN_PATTERN.test(req.params.token)) return res.status(404).json({ message: "Link not found" });
    const walk = await SafeWalk.findOne({ shareToken: req.params.token }).populate("userId", "name");
    if (!walk) return res.status(404).json({ message: "Link not found" });
    const live = ["active", "overdue", "alerted"].includes(walk.status);
    res.json({
      firstName: (walk.userId?.name || "Someone").split(" ")[0],
      destination: walk.destination || null,
      status: walk.status,
      startedAt: walk.startedAt,
      expectedArrival: walk.expectedArrival,
      endedAt: walk.endedAt || null,
      location: live ? walk.lastLocation?.coordinates || null : null,
      locationUpdatedAt: live ? walk.lastLocation?.updatedAt || null : null,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { getNetworkStats, getTrackByToken, getMedicalIdByToken, getWalkByToken };
