const User = require("../models/User");
const Hospital = require("../models/Hospital");

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

module.exports = { getNetworkStats };
