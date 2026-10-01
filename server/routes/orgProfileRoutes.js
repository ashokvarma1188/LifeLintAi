const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getOrgProfile, updateOrgProfile, updateOrgLocation, listStaff, createStaff, removeStaff } = require("../controllers/orgProfileController");

router.get("/me", protect, getOrgProfile);
router.put("/me", protect, updateOrgProfile);
router.put("/location", protect, updateOrgLocation);
router.get("/staff", protect, listStaff);
router.post("/staff", protect, createStaff);
router.delete("/staff/:id", protect, removeStaff);

module.exports = router;
