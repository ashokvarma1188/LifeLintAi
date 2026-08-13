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

module.exports = { createSOS };
