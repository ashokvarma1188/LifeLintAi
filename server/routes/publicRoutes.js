const express = require("express");
const router = express.Router();
const { getNetworkStats } = require("../controllers/publicController");

// Deliberately no auth middleware — these are the landing page's public stats.
router.get("/network-stats", getNetworkStats);

module.exports = router;
