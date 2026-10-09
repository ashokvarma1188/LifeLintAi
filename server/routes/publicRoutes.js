const express = require("express");
const router = express.Router();
const { getNetworkStats, getTrackByToken, getMedicalIdByToken } = require("../controllers/publicController");

// Deliberately no auth middleware — these are the landing page's public stats.
router.get("/network-stats", getNetworkStats);
router.get("/track/:token", getTrackByToken);
router.get("/medical-id/:token", getMedicalIdByToken);

module.exports = router;
