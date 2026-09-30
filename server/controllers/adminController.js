const User = require("../models/User");
const EmergencyRequest = require("../models/EmergencyRequest");
const IncidentReport = require("../models/IncidentReport");
const RecordAccessLog = require("../models/RecordAccessLog");
const { publicUser } = require("./authController");
const { ORG_ROLES, ALL_ROLES } = require("../constants/roles");

/** Organisation accounts waiting on a decision, oldest request first. */
const listPending = async (req, res) => {
  try {
    const users = await User.find({ roleStatus: "pending", role: { $in: ORG_ROLES } })
      .select("-password -verificationDoc.data")
      .sort({ createdAt: 1 });

    res.json({ users: users.map(publicUser) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Every account, newest first, for the admin overview table. */
const listAll = async (req, res) => {
  try {
    const users = await User.find().select("-password -verificationDoc.data").sort({ createdAt: -1 });
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

/* suspend/reactivate differ only by the flag they write. */
const setSuspended = (suspended, successMessage) => async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be modified" });
    }

    user.suspended = suspended;
    await user.save();

    res.json({ message: successMessage, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Platform-wide counts and response-time metrics for the admin dashboard. */
const getAnalytics = async (req, res) => {
  try {
    const usersByRole = await User.aggregate([
      { $group: { _id: { role: "$role", status: "$roleStatus" }, count: { $sum: 1 } } },
    ]);

    const usersByRoleMap = {};
    ALL_ROLES.forEach((role) => {
      usersByRoleMap[role] = { approved: 0, pending: 0, rejected: 0 };
    });
    usersByRole.forEach(({ _id, count }) => {
      const role = _id.role || "civilian";
      if (!usersByRoleMap[role]) usersByRoleMap[role] = { approved: 0, pending: 0, rejected: 0 };
      usersByRoleMap[role][_id.status || "approved"] = count;
    });

    const suspendedCount = await User.countDocuments({ suspended: true });

    const sosByStatus = await EmergencyRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const sosStatusMap = { pending: 0, accepted: 0, resolved: 0, cancelled: 0 };
    sosByStatus.forEach(({ _id, count }) => {
      sosStatusMap[_id] = count;
    });
    const totalSos = Object.values(sosStatusMap).reduce((a, b) => a + b, 0);

    // Average time from raised -> accepted, and accepted -> resolved, in minutes.
    const responseTimes = await EmergencyRequest.aggregate([
      { $match: { status: { $in: ["accepted", "resolved"] } } },
      {
        $project: {
          acceptMinutes: { $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 60000] },
        },
      },
      { $group: { _id: null, avgAcceptMinutes: { $avg: "$acceptMinutes" }, count: { $sum: 1 } } },
    ]);

    const reportsByDept = await IncidentReport.aggregate([
      { $group: { _id: { department: "$department", status: "$status" }, count: { $sum: 1 } } },
    ]);
    const reportsMap = { police: { open: 0, resolved: 0 }, firestation: { open: 0, resolved: 0 } };
    reportsByDept.forEach(({ _id, count }) => {
      if (reportsMap[_id.department]) reportsMap[_id.department][_id.status] = count;
    });

    res.json({
      usersByRole: usersByRoleMap,
      suspendedCount,
      sos: {
        byStatus: sosStatusMap,
        total: totalSos,
        falseAlarmRate: totalSos ? Math.round((sosStatusMap.cancelled / totalSos) * 1000) / 10 : 0,
        avgAcceptMinutes: responseTimes[0]?.avgAcceptMinutes
          ? Math.round(responseTimes[0].avgAcceptMinutes * 10) / 10
          : null,
      },
      incidentReports: reportsMap,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Platform-wide health-record access log, for admin oversight. */
const getAuditLog = async (req, res) => {
  try {
    const entries = await RecordAccessLog.find({})
      .populate("patientId", "name phone")
      .populate("hospitalId", "name orgName")
      .sort({ createdAt: -1 })
      .limit(300);

    res.json({ entries });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Streams an org account's proof document back to the admin. */
const getVerificationDoc = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user || !user.verificationDoc?.data) {
      return res.status(404).json({ message: "No document on file for this account" });
    }

    res.setHeader("Content-Type", user.verificationDoc.contentType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${(user.verificationDoc.filename || "document").replace(/"/g, "")}"`
    );
    res.send(user.verificationDoc.data);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = {
  listPending,
  listAll,
  approveUser: setRoleStatus("approved", "Account approved"),
  rejectUser: setRoleStatus("rejected", "Account rejected"),
  suspendUser: setSuspended(true, "Account suspended"),
  reactivateUser: setSuspended(false, "Account reactivated"),
  getAnalytics,
  getAuditLog,
  getVerificationDoc,
};
