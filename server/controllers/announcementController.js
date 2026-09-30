const mongoose = require("mongoose");
const Announcement = require("../models/Announcement");

/** Every logged-in user sees active announcements — a platform-wide banner. */
const listActive = async (req, res) => {
  try {
    const announcements = await Announcement.find({ active: true }).sort({ createdAt: -1 }).limit(10);
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const listAllAdmin = async (req, res) => {
  try {
    const announcements = await Announcement.find({}).sort({ createdAt: -1 });
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();
    if (!message) {
      return res.status(400).json({ message: "Announcement text is required" });
    }

    const announcement = await Announcement.create({ message, createdBy: req.user._id });
    res.status(201).json({ message: "Announcement posted", announcement });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const deactivateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    const announcement = await Announcement.findByIdAndUpdate(id, { active: false }, { new: true });
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.json({ message: "Announcement removed", announcement });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { listActive, listAllAdmin, createAnnouncement, deactivateAnnouncement };
