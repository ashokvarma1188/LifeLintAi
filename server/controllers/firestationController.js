const User = require("../models/User");

const getFleet = async (req, res) => {
  res.json({ fleet: req.user.fleet || [] });
};

/** Replaces the whole fleet list — simplest correct semantics for a small array edited as a form. */
const updateFleet = async (req, res) => {
  try {
    const { fleet } = req.body;

    if (!Array.isArray(fleet)) {
      return res.status(400).json({ message: "Fleet must be a list" });
    }

    for (const unit of fleet) {
      if (!unit.unitName || !unit.unitName.trim()) {
        return res.status(400).json({ message: "Every unit needs a name" });
      }
      if (unit.status && !["available", "dispatched", "maintenance"].includes(unit.status)) {
        return res.status(400).json({ message: `Invalid status for unit "${unit.unitName}"` });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fleet: fleet.map((u) => ({ unitName: u.unitName.trim(), status: u.status || "available" })) },
      { new: true }
    );

    res.json({ message: "Fleet updated", fleet: user.fleet });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { getFleet, updateFleet };
