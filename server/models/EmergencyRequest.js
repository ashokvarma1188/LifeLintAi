const mongoose = require("mongoose");

const emergencyRequestSchema = new mongoose.Schema(
  {
    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["medical", "accident", "safety", "other"], default: "medical" },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    status: { type: String, enum: ["pending", "accepted", "resolved"], default: "pending" },
    assignedHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
  },
  { timestamps: true }
);

emergencyRequestSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("EmergencyRequest", emergencyRequestSchema);
