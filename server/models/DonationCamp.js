const mongoose = require("mongoose");

/* A blood donation camp a hospital organises; civilians register, the hospital marks who donated. */
const donationCampSchema = new mongoose.Schema(
  {
    organiserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    organiserName: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    venue: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    capacity: { type: Number, default: 100 },
    registrations: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        registeredAt: { type: Date, default: Date.now },
        donatedAt: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

donationCampSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("DonationCamp", donationCampSchema);
