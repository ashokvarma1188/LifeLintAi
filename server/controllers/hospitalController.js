const Hospital = require("../models/Hospital");
const geocodeAddress = require("../utils/geocode");

const addHospital = async (req, res) => {
  try {
    const { name, phone, address, totalBeds, availableBeds, ambulanceAvailable } = req.body;

    if (!address) {
      return res.status(400).json({ message: "Address is required" });
    }

    const { latitude, longitude } = await geocodeAddress(address);

    const hospital = await Hospital.create({
      name,
      phone,
      address,
      location: { type: "Point", coordinates: [longitude, latitude] },
      totalBeds,
      availableBeds,
      ambulanceAvailable,
    });

    res.status(201).json({ message: "Hospital added successfully", hospital });
  } catch (err) {
    res.status(400).json({ message: err.message || "Something went wrong" });
  }
};

const getNearbyHospitals = async (req, res) => {
  try {
    const { longitude, latitude } = req.query;

    const hospitals = await Hospital.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: 10000,
        },
      },
    });

    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { addHospital, getNearbyHospitals };
