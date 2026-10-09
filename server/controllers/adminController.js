const User = require("../models/User");
const EmergencyRequest = require("../models/EmergencyRequest");
const IncidentReport = require("../models/IncidentReport");
const RecordAccessLog = require("../models/RecordAccessLog");
const AdminActionLog = require("../models/AdminActionLog");
const { publicUser } = require("./authController");
const { ORG_ROLES, ALL_ROLES, ROLE_LABELS } = require("../constants/roles");
const { sendAccountStatusEmail } = require("../utils/mailer");

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
    // Agency accounts must use 2FA — enforced here (not just at signup) so it also
    // applies to existing accounts the moment they're approved. The demo account
    // is exempt so it can keep switching roles instantly with no extra step.
    if (status === "approved" && ORG_ROLES.includes(user.role) && !user.isDemo) {
      user.twoFactorEnabled = true;
    }
    await user.save();

    AdminActionLog.create({ adminId: req.user._id, targetUserId: user._id, action: status }).catch(() => {});
    sendAccountStatusEmail(user.email, { approved: status === "approved", roleLabel: ROLE_LABELS[user.role] || user.role }).catch(
      () => {}
    );

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
    // Invalidate any token already issued to this account — otherwise a suspended
    // user stays fully signed in until their 7-day token naturally expires.
    if (suspended) user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    AdminActionLog.create({
      adminId: req.user._id,
      targetUserId: user._id,
      action: suspended ? "suspended" : "reactivated",
    }).catch(() => {});

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

    // Legacy "citizen" accounts are civilians — folded into one row instead of a second "Civilian" line.
    const usersByRoleMap = {};
    ALL_ROLES.filter((role) => role !== "citizen").forEach((role) => {
      usersByRoleMap[role] = { approved: 0, pending: 0, rejected: 0 };
    });
    usersByRole.forEach(({ _id, count }) => {
      const role = !_id.role || _id.role === "citizen" ? "civilian" : _id.role;
      if (!usersByRoleMap[role]) usersByRoleMap[role] = { approved: 0, pending: 0, rejected: 0 };
      const status = _id.status || "approved";
      usersByRoleMap[role][status] = (usersByRoleMap[role][status] || 0) + count;
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
    const falseAlarmResolvedCount = await EmergencyRequest.countDocuments({ status: "resolved", falseAlarm: true });

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

    // Charts: alerts per day over the last 14 days, by emergency type, and the busiest ~1 km grid cells.
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 13);
    const [perDayRaw, byTypeRaw, areasRaw] = await Promise.all([
      EmergencyRequest.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } },
      ]),
      EmergencyRequest.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
      EmergencyRequest.aggregate([
        { $match: { "location.coordinates.1": { $exists: true } } },
        {
          $group: {
            _id: {
              lat: { $round: [{ $arrayElemAt: ["$location.coordinates", 1] }, 2] },
              lng: { $round: [{ $arrayElemAt: ["$location.coordinates", 0] }, 2] },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);
    const perDayMap = Object.fromEntries(perDayRaw.map((d) => [d._id, d.count]));
    const byDay = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
      byDay.push({ date: key, count: perDayMap[key] || 0 });
    }
    const byType = Object.fromEntries(byTypeRaw.map((t) => [t._id || "other", t.count]));
    const busiestAreas = areasRaw.map((a) => ({ lat: a._id.lat, lng: a._id.lng, count: a.count }));

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
        // Counts both the civilian cancelling before anyone responded, and a
        // responder resolving it and flagging it as a false alarm themselves.
        falseAlarmRate: totalSos
          ? Math.round(((sosStatusMap.cancelled + falseAlarmResolvedCount) / totalSos) * 1000) / 10
          : 0,
        avgAcceptMinutes: responseTimes[0]?.avgAcceptMinutes
          ? Math.round(responseTimes[0].avgAcceptMinutes * 10) / 10
          : null,
        byDay,
        byType,
        busiestAreas,
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

/** Who approved/rejected/suspended/reactivated which account, and when — admin's own moderation trail. */
const getActionLog = async (req, res) => {
  try {
    const entries = await AdminActionLog.find({})
      .populate("adminId", "name email")
      .populate("targetUserId", "name orgName email role")
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
  getActionLog,
  getVerificationDoc,
};
