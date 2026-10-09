const User = require("../models/User");
const { CIVILIAN_ROLES } = require("../constants/roles");

/* Donors are civilians who opted in — older accounts predate the role field entirely. */
const civilianFilter = {
  $or: [{ role: { $in: CIVILIAN_ROLES } }, { role: { $exists: false } }],
};

const REST_DAYS = 90; // minimum gap between whole-blood donations
const LIVES_PER_DONATION = 3; // one unit of blood can help up to three people
const DAY_MS = 24 * 60 * 60 * 1000;

const nextEligibleDate = (lastDonatedAt) => (lastDonatedAt ? new Date(lastDonatedAt.getTime() + REST_DAYS * DAY_MS) : null);

const listDonors = async (req, res) => {
  try {
    const { bloodGroup } = req.query;
    // Someone who gave blood in the last 90 days is resting, so they are not offered to requesters.
    const restCutoff = new Date(Date.now() - REST_DAYS * DAY_MS);
    const filter = {
      ...civilianFilter,
      donorAvailable: true,
      _id: { $ne: req.userId },
      $and: [{ $or: [{ lastDonatedAt: { $exists: false } }, { lastDonatedAt: null }, { lastDonatedAt: { $lt: restCutoff } }] }],
    };
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

    const eligibleAt = nextEligibleDate(req.user.lastDonatedAt);
    if (update.donorAvailable && eligibleAt && eligibleAt > new Date()) {
      return res.status(400).json({
        message: `You donated recently — you can be listed again from ${eligibleAt.toLocaleDateString("en-IN")}.`,
      });
    }

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

const donationSummary = (user) => {
  const eligibleAt = nextEligibleDate(user.lastDonatedAt);
  const resting = Boolean(eligibleAt && eligibleAt > new Date());
  return {
    donationCount: user.donationCount || 0,
    livesSaved: (user.donationCount || 0) * LIVES_PER_DONATION,
    lastDonatedAt: user.lastDonatedAt || null,
    nextEligibleAt: eligibleAt,
    daysUntilEligible: resting ? Math.ceil((eligibleAt - new Date()) / DAY_MS) : 0,
    eligible: !resting,
  };
};

/** The donor's own record: how many times they've given, when they can again, lives helped. */
const getDonationStatus = async (req, res) => {
  try {
    res.json(donationSummary(req.user));
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** "I just donated" — starts the 90-day rest, and takes the donor off the available list until then. */
const recordDonation = async (req, res) => {
  try {
    const eligibleAt = nextEligibleDate(req.user.lastDonatedAt);
    if (eligibleAt && eligibleAt > new Date()) {
      return res.status(400).json({ message: "A donation was already recorded recently." });
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { lastDonatedAt: new Date(), $inc: { donationCount: 1 }, donorAvailable: false },
      { new: true }
    ).select("-password");
    res.json({ message: "Thank you for donating!", ...donationSummary(user) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { listDonors, setDonorStatus, getDonationStatus, recordDonation };
