const mongoose = require("mongoose");

const medicineRequestSchema = new mongoose.Schema(
  {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pharmacyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    medicineName: { type: String, required: true },
    notes: { type: String },
    status: { type: String, enum: ["pending", "fulfilled", "declined"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MedicineRequest", medicineRequestSchema);
