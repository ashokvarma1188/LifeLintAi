const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getProfile, updateProfile } = require("../controllers/profileController");

router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);

module.exports = router;
