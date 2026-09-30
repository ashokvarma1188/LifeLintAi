const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireApproved } = require("../middleware/authMiddleware");
const { listDonors, setDonorStatus } = require("../controllers/donorController");

router.get("/", protect, requireApproved, listDonors);
router.put("/me", protect, requireApproved, setDonorStatus);

module.exports = router;
