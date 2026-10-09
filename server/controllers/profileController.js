const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const HealthRecord = require("../models/HealthRecord");
const EmergencyRequest = require("../models/EmergencyRequest");
const MedicineRequest = require("../models/MedicineRequest");
const PushSubscription = require("../models/PushSubscription");

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, age, bloodGroup, medicalHistory, allergies, emergencyContacts } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, phone, age, bloodGroup, medicalHistory, allergies, emergencyContacts },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Turns the QR-code Medical ID on (or rotates its link, which kills any old printed code). */
const enableMedicalIdLink = async (req, res) => {
  try {
    const token = crypto.randomBytes(16).toString("hex");
    await User.findByIdAndUpdate(req.userId, { medicalIdToken: token });
    res.json({ medicalIdToken: token });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const disableMedicalIdLink = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { $unset: { medicalIdToken: 1 } });
    res.json({ message: "Medical ID link turned off" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Everything LifeLink holds about this account, as one downloadable JSON file. PDFs are listed, not embedded. */
const exportMyData = async (req, res) => {
  try {
    const [user, healthRecords, sosHistory, medicineRequests] = await Promise.all([
      User.findById(req.userId).select("-password -verificationDoc.data -twoFactorCode -resetPasswordToken -emailVerificationToken"),
      HealthRecord.find({ userId: req.userId }).select("-pdf.data"),
      EmergencyRequest.find({ citizenId: req.userId }).sort({ createdAt: -1 }),
      MedicineRequest.find({ requestedBy: req.userId }).sort({ createdAt: -1 }),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.setHeader("Content-Disposition", 'attachment; filename="lifelink-my-data.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      profile: user,
      healthRecords,
      sosHistory,
      medicineRequests,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Permanently deletes the account and everything tied to it. Requires the current password to confirm. */
const deleteMyAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Enter your password to confirm account deletion" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Org accounts own other records (Hospital listings, staff logins, incident
    // reports) that would be left dangling — keep self-delete to civilians only
    // and have admin handle organisation account removal instead.
    if (user.role !== "civilian" && user.role !== "citizen") {
      return res.status(403).json({ message: "Organisation accounts can't self-delete — contact an admin." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    await Promise.all([
      HealthRecord.deleteMany({ userId: req.userId }),
      EmergencyRequest.deleteMany({ citizenId: req.userId }),
      MedicineRequest.deleteMany({ requestedBy: req.userId }),
      PushSubscription.deleteMany({ userId: req.userId }),
    ]);
    await user.deleteOne();

    res.json({ message: "Your account and all associated data have been permanently deleted." });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { getProfile, updateProfile, exportMyData, deleteMyAccount, enableMedicalIdLink, disableMedicalIdLink };
