const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    // Null until a hospital-role account first claims this record via updateHospital.
    // Once set, only that account (or an admin) may edit it — closes the gap where
    // any hospital login could edit any other hospital's public bed/ambulance data.
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    totalBeds: { type: Number, default: 0 },
    availableBeds: { type: Number, default: 0 },
    ambulanceAvailable: { type: Boolean, default: true },
    bloodBankAvailable: { type: Boolean, default: false },
    oxygenAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

hospitalSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Hospital", hospitalSchema);
