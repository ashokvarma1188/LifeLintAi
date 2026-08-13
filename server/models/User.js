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
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
