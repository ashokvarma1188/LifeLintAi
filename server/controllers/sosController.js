const mongoose = require("mongoose");
const EmergencyRequest = require("../models/EmergencyRequest");
const Hospital = require("../models/Hospital");

const createSOS = async (req, res) => {
  try {
    const { longitude, latitude, type } = req.body;

    const nearestHospital = await Hospital.findOne({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: 10000,
        },
      },
    });

    const emergencyRequest = await EmergencyRequest.create({
      citizenId: req.userId,
      type: type || "medical",
      location: { type: "Point", coordinates: [longitude, latitude] },
      assignedHospitalId: nearestHospital ? nearestHospital._id : null,
    });

    res.status(201).json({
      message: "SOS request created successfully",
      emergencyRequest,
      nearestHospital: nearestHospital || "No hospital found within 10km",
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/**
 * Every hospital sees every open request — there is no link between a
 * Hospital document and the hospital User accounts that manage it, so
 * requests can't be scoped to "my hospital" yet.
 */
const listSOS = async (req, res) => {
  try {
    const requests = await EmergencyRequest.find({})
      .populate("citizenId", "name phone bloodGroup")
      .populate("assignedHospitalId", "name")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const setStatus = (status) => async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Request not found" });
    }

    const request = await EmergencyRequest.findByIdAndUpdate(id, { status }, { new: true })
      .populate("citizenId", "name phone bloodGroup")
      .populate("assignedHospitalId", "name");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json({ message: `Request marked as ${status}`, request });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = {
  createSOS,
  listSOS,
  acceptSOS: setStatus("accepted"),
  resolveSOS: setStatus("resolved"),
};
