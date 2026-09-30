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
    donorAvailable: { type: Boolean, default: false },
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

    // Organisation profile depth — available to any org role (hospital/police/firestation/pharmacy).
    // "Verified" badge is just roleStatus === "approved"; no separate field needed for that.
    logoUrl: { type: String },
    serviceRadiusKm: { type: Number },

    // Set on a staff login created by an org account — shares that org's role/orgName.
    parentOrgId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Optional proof document (licence/registration) an org account attaches at signup.
    verificationDoc: {
      filename: { type: String },
      contentType: { type: String },
      size: { type: Number },
      data: { type: Buffer },
    },

    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },

    suspended: { type: Boolean, default: false },

    // One hand-seeded account (see scripts/createDemoAccount.js) for showing every
    // role from a single login — normal accounts can never set this on themselves.
    isDemo: { type: Boolean, default: false },

    // Bumped by "log out everywhere" — any JWT signed with an older value is rejected.
    tokenVersion: { type: Number, default: 0 },

    // Optional email-OTP 2FA.
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorCode: { type: String },
    twoFactorCodeExpires: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
