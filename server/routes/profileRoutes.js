const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireApproved } = require("../middleware/authMiddleware");
const { getProfile, updateProfile } = require("../controllers/profileController");

router.get("/me", protect, requireApproved, getProfile);
router.put("/me", protect, requireApproved, updateProfile);

module.exports = router;
