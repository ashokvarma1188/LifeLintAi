const express = require("express");
const router = express.Router();
const { addHospital, getNearbyHospitals } = require("../controllers/hospitalController");

router.post("/", addHospital);
router.get("/nearby", getNearbyHospitals);

module.exports = router;
