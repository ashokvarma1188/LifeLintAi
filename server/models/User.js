const mongoose = require("mongoose");
const { ALL_ROLES, ROLE_STATUSES } = require("../constants/roles");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    role: { type: String, enum: ALL_ROLES, default: "civilian" },

    // Civilians are auto-approved; organisation accounts wait for an admin.
    roleStatus: { type: String, enum: ROLE_STATUSES, default: "approved" },

    // Hospital / police / fire station / pharmacy display name.
    orgName: { type: String },

    bloodGroup: { type: String },
    phone: { type: String },
    age: { type: Number },
    medicalHistory: [{ type: String }],
    allergies: [{ type: String }],
    emergencyContacts: [
      {
        name: { type: String },
        phone: { type: String },
        relation: { type: String },
      },
    ],

    // Fire station only: engines/units under this station.
    fleet: [
      {
        unitName: { type: String, required: true },
        status: { type: String, enum: ["available", "dispatched", "maintenance"], default: "available" },
      },
    ],

    // Pharmacy only: medicines this pharmacy has published stock for.
    stock: [
      {
        medicineName: { type: String, required: true },
        inStock: { type: Boolean, default: true },
        quantity: { type: Number },
      },
    ],
    openHours: { type: String },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
