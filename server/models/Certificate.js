const mongoose = require("mongoose");

/*
 * A certificate someone can download and anyone can check at /verify/<code>.
 * Kinds: passing the first-aid course, and each blood donation.
 */
const certificateSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["first_aid", "blood_donation"], required: true },
    recipientName: { type: String, required: true },
    title: { type: String, required: true },
    detail: { type: String },
    // first_aid: { score, total } · blood_donation: { donationNumber, donatedAt, place, bloodGroup }
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Certificate", certificateSchema);
