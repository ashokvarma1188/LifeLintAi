const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireHospital } = require("../middleware/authMiddleware");
const {
  addHospital,
  getNearbyHospitals,
  listHospitals,
  updateHospital,
} = require("../controllers/hospitalController");

router.post("/", addHospital);
router.get("/nearby", getNearbyHospitals);
router.get("/", listHospitals);
router.patch("/:id", protect, requireHospital, updateHospital);

module.exports = router;
