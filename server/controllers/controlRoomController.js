/*
 * The live city control room: every open SOS from the last 24 hours, hospital capacity
 * and any active Safety Check, for admins and approved responders. Alerts carry no
 * names, phone numbers or medical data, only what's needed to see the situation.
 */
const EmergencyRequest = require("../models/EmergencyRequest");
const Hospital = require("../models/Hospital");
const SafetyCheck = require("../models/SafetyCheck");
const SafetyResponse = require("../models/SafetyResponse");

const OPEN_STATUSES = ["pending", "accepted", "en_route"];
const DAY_MS = 24 * 60 * 60 * 1000;

const getControlRoom = async (req, res) => {
  try {
    const since = new Date(Date.now() - DAY_MS);
    const [alerts, resolvedToday, hospitals, checks] = await Promise.all([
      EmergencyRequest.find({ status: { $in: OPEN_STATUSES }, createdAt: { $gte: since } })
        .select("type status targets location createdAt updatedAt etaMinutes respondedByRole responderLocation")
        .sort({ createdAt: -1 })
        .limit(300)
        .lean(),
      EmergencyRequest.countDocuments({ status: "resolved", updatedAt: { $gte: since } }),
      Hospital.find({})
        .select("name location totalBeds availableBeds icuBeds icuAvailableBeds ambulanceCount ambulanceAvailable bloodStock")
        .limit(500)
        .lean(),
      SafetyCheck.find({ status: "active" }).select("title kind area createdAt").lean(),
    ]);

    const responseCounts = checks.length
      ? await SafetyResponse.aggregate([
          { $match: { checkId: { $in: checks.map((check) => check._id) } } },
          { $group: { _id: { checkId: "$checkId", status: "$status" }, count: { $sum: 1 } } },
        ])
      : [];

    const byType = {};
    const byStatus = { pending: 0, accepted: 0, en_route: 0 };
    for (const alert of alerts) {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      byStatus[alert.status] += 1;
    }

    const capacity = hospitals.reduce(
      (sum, hospital) => ({
        freeBeds: sum.freeBeds + (hospital.availableBeds || 0),
        freeIcu: sum.freeIcu + (hospital.icuAvailableBeds || 0),
        ambulances: sum.ambulances + (hospital.ambulanceAvailable ? hospital.ambulanceCount || 0 : 0),
        withBeds: sum.withBeds + ((hospital.availableBeds || 0) > 0 ? 1 : 0),
      }),
      { freeBeds: 0, freeIcu: 0, ambulances: 0, withBeds: 0 }
    );

    res.json({
      generatedAt: new Date(),
      alerts: alerts.map((alert) => ({
        _id: alert._id,
        type: alert.type,
        status: alert.status,
        targets: alert.targets,
        coordinates: alert.location?.coordinates,
        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt,
        etaMinutes: alert.etaMinutes,
        respondedByRole: alert.respondedByRole,
        responderCoordinates: alert.responderLocation?.coordinates || null,
      })),
      hospitals: hospitals
        .filter((hospital) => hospital.location?.coordinates?.length === 2)
        .map((hospital) => ({
          _id: hospital._id,
          name: hospital.name,
          coordinates: hospital.location.coordinates,
          totalBeds: hospital.totalBeds || 0,
          availableBeds: hospital.availableBeds || 0,
          icuAvailableBeds: hospital.icuAvailableBeds || 0,
          ambulances: hospital.ambulanceAvailable ? hospital.ambulanceCount || 0 : 0,
          bloodUnits: Object.values(hospital.bloodStock || {}).reduce((a, b) => a + (Number(b) || 0), 0),
        })),
      safetyChecks: checks.map((check) => {
        const counts = { safe: 0, need_help: 0, not_in_area: 0 };
        for (const row of responseCounts) {
          if (String(row._id.checkId) === String(check._id)) counts[row._id.status] = row.count;
        }
        return { _id: check._id, title: check.title, kind: check.kind, center: check.area.center.coordinates, radiusKm: check.area.radiusKm, counts };
      }),
      stats: { open: alerts.length, resolvedToday, byType, byStatus, ...capacity, hospitals: hospitals.length },
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Admins, and approved hospital / police / fire station accounts. */
const requireControlRoomAccess = (req, res, next) => {
  const role = req.user?.role;
  if (role === "admin") return next();
  if (["hospital", "police", "firestation"].includes(role) && req.user.roleStatus === "approved") return next();
  return res.status(403).json({ message: "The control room is for admins and approved responders." });
};

module.exports = { getControlRoom, requireControlRoomAccess };
