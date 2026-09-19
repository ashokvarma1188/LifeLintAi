const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const { listAlerts, listReports, createReport, updateReportStatus } = require("../controllers/incidentController");

const requirePolice = requireRole("police", "Police");

router.use(protect, requirePolice);

router.get("/alerts", listAlerts);
router.get("/reports", listReports);
router.post("/reports", createReport);
router.patch("/reports/:id", updateReportStatus);

module.exports = router;
