const express = require("express");
const router = express.Router();
const { protect, requireApproved } = require("../middleware/authMiddleware");
const { getDonationCertificate, listMine } = require("../controllers/certificateController");

router.get("/mine", protect, requireApproved, listMine);
router.post("/donation", protect, requireApproved, getDonationCertificate);

module.exports = router;
