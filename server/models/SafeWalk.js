const mongoose = require("mongoose");

/**
 * "Walk with me": the user shares their live location for a trip and says when they
 * should arrive. If they don't confirm arrival in time the walk turns overdue, and —
 * if they opted in — the police get an SOS with their last known location.
 */
const safeWalkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    destination: { type: String, trim: true, maxlength: 120 },
    startedAt: { type: Date, default: Date.now },
    expectedArrival: { type: Date, required: true },
    status: { type: String, enum: ["active", "overdue", "alerted", "arrived", "cancelled"], default: "active", index: true },
    autoSos: { type: Boolean, default: true },
    lastLocation: {
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
      updatedAt: { type: Date },
    },
    overdueAt: { type: Date },
    endedAt: { type: Date },
    sosRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "EmergencyRequest" },
    // Unguessable token behind the public page family members follow.
    shareToken: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SafeWalk", safeWalkSchema);
