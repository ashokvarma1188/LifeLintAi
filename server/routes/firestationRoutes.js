const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const { listAlerts, listReports, createReport, updateReportStatus } = require("../controllers/incidentController");
const { getFleet, updateFleet } = require("../controllers/firestationController");

const requireFirestation = requireRole("firestation", "Fire Station");

router.use(protect, requireFirestation);

router.get("/alerts", listAlerts);
router.get("/reports", listReports);
router.post("/reports", createReport);
router.patch("/reports/:id", updateReportStatus);

router.get("/fleet", getFleet);
router.put("/fleet", updateFleet);

module.exports = router;
