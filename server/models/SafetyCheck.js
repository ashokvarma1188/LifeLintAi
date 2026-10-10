const mongoose = require("mongoose");

/* An admin-declared disaster area (flood, cyclone…) where everyone is asked "Are you safe?". */
const safetyCheckSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    kind: { type: String, enum: ["flood", "cyclone", "fire", "earthquake", "heatwave", "other"], default: "other" },
    message: { type: String, trim: true },
    area: {
      center: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], required: true }, // [longitude, latitude]
      },
      radiusKm: { type: Number, required: true },
    },
    status: { type: String, enum: ["active", "closed"], default: "active", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SafetyCheck", safetyCheckSchema);
