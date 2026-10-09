const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireApproved } = require("../middleware/authMiddleware");
const { listDonors, setDonorStatus, getDonationStatus, recordDonation } = require("../controllers/donorController");

router.get("/", protect, requireApproved, listDonors);
router.put("/me", protect, requireApproved, setDonorStatus);
router.get("/me/donations", protect, requireApproved, getDonationStatus);
router.post("/me/donated", protect, requireApproved, recordDonation);

module.exports = router;
