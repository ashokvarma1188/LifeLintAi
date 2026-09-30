const mongoose = require("mongoose");
const User = require("../models/User");
const MedicineRequest = require("../models/MedicineRequest");

/** Every approved pharmacy — for civilians to browse stock and send requests. */
const listPharmacies = async (req, res) => {
  try {
    const pharmacies = await User.find({ role: "pharmacy", roleStatus: "approved" }).select(
      "name orgName phone stock openHours isOpen"
    );
    res.json({ pharmacies });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const createMedicineRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { medicineName, notes } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Pharmacy not found" });
    }
    if (!medicineName || !medicineName.trim()) {
      return res.status(400).json({ message: "Medicine name is required" });
    }

    const pharmacy = await User.findOne({ _id: id, role: "pharmacy", roleStatus: "approved" });
    if (!pharmacy) {
      return res.status(404).json({ message: "Pharmacy not found" });
    }

    const request = await MedicineRequest.create({
      requestedBy: req.userId,
      pharmacyId: pharmacy._id,
      medicineName: medicineName.trim(),
      notes: (notes || "").trim(),
    });

    res.status(201).json({ message: "Request sent to the pharmacy", request });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** A civilian's own sent requests, across every pharmacy. */
const myRequests = async (req, res) => {
  try {
    const requests = await MedicineRequest.find({ requestedBy: req.userId })
      .populate("pharmacyId", "name orgName")
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { listPharmacies, createMedicineRequest, myRequests };
