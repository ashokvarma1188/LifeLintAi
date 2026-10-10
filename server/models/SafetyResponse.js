const mongoose = require("mongoose");

/* One person's answer to a Safety Check. "need_help" also raises an SOS (sosRequestId). */
const safetyResponseSchema = new mongoose.Schema(
  {
    checkId: { type: mongoose.Schema.Types.ObjectId, ref: "SafetyCheck", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["safe", "need_help", "not_in_area"], required: true },
    location: { coordinates: { type: [Number], default: undefined } }, // [longitude, latitude]
    distanceKm: { type: Number },
    note: { type: String, trim: true },
    sosRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "EmergencyRequest" },
  },
  { timestamps: true }
);

safetyResponseSchema.index({ checkId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("SafetyResponse", safetyResponseSchema);
