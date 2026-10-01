const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireApproved } = require("../middleware/authMiddleware");
const { listNearby } = require("../controllers/emergencyServicesController");

router.get("/nearby", protect, requireApproved, listNearby);

module.exports = router;
