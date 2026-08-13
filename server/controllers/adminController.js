const User = require("../models/User");
const { publicUser } = require("./authController");
const { ORG_ROLES } = require("../constants/roles");

/** Organisation accounts waiting on a decision, oldest request first. */
const listPending = async (req, res) => {
  try {
    const users = await User.find({ roleStatus: "pending", role: { $in: ORG_ROLES } })
      .select("-password")
      .sort({ createdAt: 1 });

    res.json({ users: users.map(publicUser) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Every account, newest first, for the admin overview table. */
const listAll = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ users: users.map(publicUser) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/* approve/reject differ only by the status they write. */
const setRoleStatus = (status, successMessage) => async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be modified" });
    }

    user.roleStatus = status;
    await user.save();

    res.json({ message: successMessage, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = {
  listPending,
  listAll,
  approveUser: setRoleStatus("approved", "Account approved"),
  rejectUser: setRoleStatus("rejected", "Account rejected"),
};
