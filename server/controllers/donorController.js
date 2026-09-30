const User = require("../models/User");
const { CIVILIAN_ROLES } = require("../constants/roles");

/* Donors are civilians who opted in — older accounts predate the role field entirely. */
const civilianFilter = {
  $or: [{ role: { $in: CIVILIAN_ROLES } }, { role: { $exists: false } }],
};

const listDonors = async (req, res) => {
  try {
    const { bloodGroup } = req.query;
    const filter = { ...civilianFilter, donorAvailable: true, _id: { $ne: req.userId } };
    if (bloodGroup) filter.bloodGroup = bloodGroup;

    const donors = await User.find(filter).select("name phone bloodGroup");
    res.json({ donors });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const setDonorStatus = async (req, res) => {
  try {
    const { donorAvailable, bloodGroup } = req.body;
    const update = {};
    if (donorAvailable !== undefined) update.donorAvailable = Boolean(donorAvailable);
    if (bloodGroup !== undefined) update.bloodGroup = bloodGroup;

    if (update.donorAvailable && !update.bloodGroup && !req.user.bloodGroup) {
      return res.status(400).json({ message: "Set your blood group first so donors can find you" });
    }

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select("-password");
    res.json({
      message: "Donor status updated",
      donorAvailable: user.donorAvailable,
      bloodGroup: user.bloodGroup || null,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { listDonors, setDonorStatus };
