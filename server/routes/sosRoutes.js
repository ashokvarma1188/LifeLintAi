const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireHospital } = require("../middleware/authMiddleware");
const { createSOS, listSOS, acceptSOS, resolveSOS } = require("../controllers/sosController");

router.post("/", protect, createSOS);

router.get("/", protect, requireHospital, listSOS);
router.patch("/:id/accept", protect, requireHospital, acceptSOS);
router.patch("/:id/resolve", protect, requireHospital, resolveSOS);

module.exports = router;
