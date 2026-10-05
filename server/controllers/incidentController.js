const mongoose = require("mongoose");
const EmergencyRequest = require("../models/EmergencyRequest");
const IncidentReport = require("../models/IncidentReport");
const { redactMedicalId } = require("../utils/sosHelpers");

const DEFAULT_SERVICE_RADIUS_KM = 25;

/**
 * Only alerts the civilian chose to send to this responder's own service
 * (police/firestation), scoped to the officer's own service radius once
 * they've set a location (via Org Profile) — same pattern as the hospital
 * side (sosController.listSOS). Accounts with no location set still see
 * every alert targeted at their service, same as before.
 */
const listAlerts = async (req, res) => {
  try {
    const filter = {
      status: { $in: ["pending", "accepted", "en_route"] },
      targets: req.user.role,
    };

    if (req.user.location?.coordinates?.length === 2) {
      const radiusKm = req.user.serviceRadiusKm || DEFAULT_SERVICE_RADIUS_KM;
      filter.location = {
        $near: { $geometry: req.user.location, $maxDistance: radiusKm * 1000 },
      };
    }

    const requests = await EmergencyRequest.find(filter)
      .populate("citizenId", "name phone bloodGroup allergies medicalHistory")
      .populate("assignedHospitalId", "name phone address availableBeds ambulanceAvailable ambulanceCount")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ requests: requests.map(redactMedicalId) });
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
