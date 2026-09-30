const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireHospital, requireAdmin, requireApproved } = require("../middleware/authMiddleware");
const {
  addHospital,
  getNearbyHospitals,
  listHospitals,
  updateHospital,
} = require("../controllers/hospitalController");

// Hospitals are curated directory data — only an admin seeds new entries.
router.post("/", protect, requireAdmin, addHospital);
router.get("/nearby", protect, requireApproved, getNearbyHospitals);
router.get("/", protect, requireHospital, listHospitals);
router.patch("/:id", protect, requireHospital, updateHospital);

module.exports = router;
