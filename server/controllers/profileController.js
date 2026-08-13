const User = require("../models/User");

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

module.exports = { getProfile, updateProfile };
