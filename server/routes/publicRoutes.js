const express = require("express");
const router = express.Router();
const { getNetworkStats, getTrackByToken, getMedicalIdByToken, getWalkByToken } = require("../controllers/publicController");
const { verifyCertificate } = require("../controllers/certificateController");

// Deliberately no auth middleware — these are the landing page's public stats.
router.get("/network-stats", getNetworkStats);
router.get("/track/:token", getTrackByToken);
router.get("/medical-id/:token", getMedicalIdByToken);
router.get("/walk/:token", getWalkByToken);
router.get("/certificates/:code", verifyCertificate);

module.exports = router;
