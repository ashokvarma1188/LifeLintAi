const User = require("../models/User");

const DIRECTORY_ROLES = ["police", "firestation"];
const DEFAULT_RADIUS_KM = 25;

/**
 * Approved police/fire station accounts, for civilians browsing "Emergency
 * Nearby". Geo-sorted by distance when the civilian shares their location;
 * otherwise (or for accounts that haven't set a location yet) falls back to
 * listing everyone of that type so the directory is never empty.
 */
const listNearby = async (req, res) => {
  try {
    const { latitude, longitude, role } = req.query;
    const roles = role && DIRECTORY_ROLES.includes(role) ? [role] : DIRECTORY_ROLES;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    const withLocation = hasCoords
      ? await User.find({
          role: { $in: roles },
          roleStatus: "approved",
          location: {
            $near: {
              $geometry: { type: "Point", coordinates: [lng, lat] },
              $maxDistance: DEFAULT_RADIUS_KM * 1000,
            },
          },
        }).select("name orgName role phone location openHours isOpen")
      : [];

    // Accounts of this type that haven't set a location yet still show up,
    // just without a distance — better than being invisible in the directory.
    const withoutLocation = await User.find({
      role: { $in: roles },
      roleStatus: "approved",
      location: { $exists: false },
    }).select("name orgName role phone location openHours isOpen");

    res.json({ services: [...withLocation, ...withoutLocation] });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { listNearby };
