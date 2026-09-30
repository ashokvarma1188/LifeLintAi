const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/authMiddleware");
const {
  listPending,
  listAll,
  approveUser,
  rejectUser,
  suspendUser,
  reactivateUser,
  getAnalytics,
  getAuditLog,
  getVerificationDoc,
} = require("../controllers/adminController");
const {
  listAllAdmin,
  createAnnouncement,
  deactivateAnnouncement,
} = require("../controllers/announcementController");

router.use(protect, requireAdmin);

router.get("/pending", listPending);
router.get("/all", listAll);
router.post("/approve/:userId", approveUser);
router.post("/reject/:userId", rejectUser);
router.post("/suspend/:userId", suspendUser);
router.post("/reactivate/:userId", reactivateUser);
router.get("/analytics", getAnalytics);
router.get("/audit-log", getAuditLog);
router.get("/document/:userId", getVerificationDoc);
router.get("/announcements", listAllAdmin);
router.post("/announcements", createAnnouncement);
router.post("/announcements/:id/deactivate", deactivateAnnouncement);

module.exports = router;
