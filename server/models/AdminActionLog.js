const mongoose = require("mongoose");

/** Who approved/rejected/suspended/reactivated which account, and when — admin's own moderation trail. */
const adminActionLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: ["approved", "rejected", "suspended", "reactivated"], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminActionLog", adminActionLogSchema);
