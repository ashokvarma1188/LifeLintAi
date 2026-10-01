const mongoose = require("mongoose");
const { BLOOD_GROUPS } = require("../utils/bloodCompatibility");

const bloodRequestSchema = new mongoose.Schema(
  {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    unitsNeeded: { type: Number, default: 1, min: 1 },
    notes: { type: String, trim: true },
    status: { type: String, enum: ["open", "fulfilled", "cancelled"], default: "open" },

    // One entry per donor who has responded — self-selected, not pre-notified
    // (there's no push-notification system), so only actioned responses are stored.
    responses: [
      {
        donorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, enum: ["accepted", "declined"], required: true },
        respondedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);
