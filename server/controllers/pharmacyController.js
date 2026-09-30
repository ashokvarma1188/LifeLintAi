const mongoose = require("mongoose");
const User = require("../models/User");
const MedicineRequest = require("../models/MedicineRequest");

const getStock = async (req, res) => {
  res.json({ stock: req.user.stock || [], openHours: req.user.openHours || "", isOpen: req.user.isOpen !== false });
};

/** Replaces the whole stock list — simplest correct semantics for a small list edited as a form. */
const updateStock = async (req, res) => {
  try {
    const { stock } = req.body;

    if (!Array.isArray(stock)) {
      return res.status(400).json({ message: "Stock must be a list" });
    }

    for (const item of stock) {
      if (!item.medicineName || !item.medicineName.trim()) {
        return res.status(400).json({ message: "Every stock entry needs a medicine name" });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        stock: stock.map((item) => ({
          medicineName: item.medicineName.trim(),
          inStock: item.inStock !== false,
          quantity: item.quantity === undefined || item.quantity === "" ? undefined : Number(item.quantity),
        })),
      },
      { new: true }
    );

    res.json({ message: "Stock updated", stock: user.stock });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const { openHours, isOpen } = req.body;
    const update = {};
    if (openHours !== undefined) update.openHours = openHours;
    if (isOpen !== undefined) update.isOpen = Boolean(isOpen);

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ message: "Availability updated", openHours: user.openHours || "", isOpen: user.isOpen !== false });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Incoming medicine requests for this pharmacy. Empty until civilians have a way to send one. */
const listRequests = async (req, res) => {
  try {
    const requests = await MedicineRequest.find({ pharmacyId: req.user._id })
      .populate("requestedBy", "name phone")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Only the pharmacy the request was sent to can fulfil/decline it, and only while pending. */
const setRequestStatus = (status) => async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Request not found" });
    }

    const request = await MedicineRequest.findOneAndUpdate(
      { _id: id, pharmacyId: req.user._id, status: "pending" },
      { status },
      { new: true }
    ).populate("requestedBy", "name phone");

    if (!request) {
      return res.status(404).json({ message: "Request not found or already handled" });
    }

    res.json({ message: `Request marked as ${status}`, request });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = {
  getStock,
  updateStock,
  updateAvailability,
  listRequests,
  fulfilRequest: setRequestStatus("fulfilled"),
  declineRequest: setRequestStatus("declined"),
};
