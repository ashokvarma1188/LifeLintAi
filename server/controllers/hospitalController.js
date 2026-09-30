const mongoose = require("mongoose");
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

/**
 * A hospital user picks "mine" from here when first setting up beds. Once a
 * record is claimed (ownerId set), it drops out of every other hospital's
 * list — only the claiming account (or an admin) can still see/edit it.
 */
const listHospitals = async (req, res) => {
  try {
    const filter =
      req.user.role === "admin"
        ? {}
        : { $or: [{ ownerId: null }, { ownerId: req.user._id }] };

    const hospitals = await Hospital.find(filter).sort({ name: 1 });
    res.json({ hospitals });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/**
 * Claim-on-first-edit: an unclaimed record (ownerId null) becomes owned by
 * whoever first updates it; after that, only that account or an admin can.
 * This closes the IDOR gap (any hospital account could edit any hospital)
 * without needing a one-off migration for hospitals seeded before ownerId existed.
 */
const updateHospital = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const existing = await Hospital.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Hospital not found" });
    }
    const isOwner = existing.ownerId && existing.ownerId.equals(req.user._id);
    const isUnclaimed = !existing.ownerId;
    if (req.user.role !== "admin" && !isOwner && !isUnclaimed) {
      return res.status(403).json({ message: "You can only update a hospital your account manages" });
    }

    const { totalBeds, availableBeds, ambulanceAvailable, bloodBankAvailable, oxygenAvailable } = req.body;
    const update = {};
    if (totalBeds !== undefined) update.totalBeds = totalBeds;
    if (availableBeds !== undefined) update.availableBeds = availableBeds;
    if (ambulanceAvailable !== undefined) update.ambulanceAvailable = ambulanceAvailable;
    if (bloodBankAvailable !== undefined) update.bloodBankAvailable = bloodBankAvailable;
    if (oxygenAvailable !== undefined) update.oxygenAvailable = oxygenAvailable;
    if (isUnclaimed && req.user.role === "hospital") update.ownerId = req.user._id;

    const hospital = await Hospital.findByIdAndUpdate(id, update, { new: true });

    res.json({ message: "Hospital updated", hospital });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { addHospital, getNearbyHospitals, listHospitals, updateHospital };
