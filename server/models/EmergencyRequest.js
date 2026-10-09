const mongoose = require("mongoose");

const emergencyRequestSchema = new mongoose.Schema(
  {
    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["medical", "fire", "accident", "safety", "other"], default: "medical" },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "en_route", "declined", "resolved", "cancelled"],
      default: "pending",
    },
    assignedHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },

    // Who actually responded (accepted/declined/resolved), and their ETA in minutes if given.
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    respondedByRole: { type: String, enum: ["hospital", "police", "firestation"] },
    etaMinutes: { type: Number },

    // The responder's last reported position once they've accepted — lets the civilian
    // watch help approach. Not a GeoJSON point on purpose: it is never queried spatially.
    responderLocation: {
      coordinates: { type: [Number], default: undefined },
      updatedAt: { type: Date },
    },

    // Set by the responder on resolve — distinct from the civilian's own "cancel",
    // this is the responder's call that there was nothing to respond to.
    falseAlarm: { type: Boolean, default: false },

    // Civilian's own reason when they cancel a still-pending alert themselves.
    cancelReason: { type: String, enum: ["safe_now", "sent_by_mistake", "other"] },

    // Opt-in per alert — when true, responders additionally see blood group,
    // allergies and medical history alongside name/phone.
    shareMedicalId: { type: Boolean, default: false },

    // Unguessable token behind the public "track this SOS" link the civilian can send to family.
    shareToken: { type: String, index: true, sparse: true },

    /*
     * Which services the civilian chose to alert — controls who sees this request.
     * "pharmacy" isn't included: there's no pharmacy alerts inbox to respond from,
     * so it was previously accepted here but silently dropped by createSOS.
     */
    targets: {
      type: [{ type: String, enum: ["hospital", "police", "firestation"] }],
      default: ["hospital"],
      validate: { validator: (arr) => arr.length > 0, message: "Pick at least one service to alert" },
    },
  },
  { timestamps: true }
);

emergencyRequestSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("EmergencyRequest", emergencyRequestSchema);
