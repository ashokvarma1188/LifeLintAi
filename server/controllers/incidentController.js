const mongoose = require("mongoose");
const EmergencyRequest = require("../models/EmergencyRequest");
const IncidentReport = require("../models/IncidentReport");

/*
 * Police and fire station both respond to the same pool of SOS alerts —
 * there's no per-department routing on EmergencyRequest yet, so both see
 * every open alert platform-wide, same as hospitals do.
 */
const listAlerts = async (req, res) => {
  try {
    const requests = await EmergencyRequest.find({ status: { $in: ["pending", "accepted"] } })
      .populate("citizenId", "name phone")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const listReports = async (req, res) => {
  try {
    const reports = await IncidentReport.find({ department: req.user.role })
      .populate("reportedBy", "name orgName")
      .sort({ createdAt: -1 });

    res.json({ reports });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const createReport = async (req, res) => {
  try {
    const { title, description, relatedRequestId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (relatedRequestId && !mongoose.isValidObjectId(relatedRequestId)) {
      return res.status(400).json({ message: "Invalid related request" });
    }

    const report = await IncidentReport.create({
      reportedBy: req.user._id,
      department: req.user.role,
      title: title.trim(),
      description: (description || "").trim(),
      relatedRequestId: relatedRequestId || undefined,
    });

    res.status(201).json({ message: "Report filed", report });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "Report not found" });
    }
    if (!["open", "resolved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const report = await IncidentReport.findOneAndUpdate(
      { _id: id, department: req.user.role },
      { status },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.json({ message: `Report marked as ${status}`, report });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { listAlerts, listReports, createReport, updateReportStatus };
