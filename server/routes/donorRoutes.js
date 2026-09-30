const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { listDonors, setDonorStatus } = require("../controllers/donorController");

router.get("/", protect, listDonors);
router.put("/me", protect, setDonorStatus);

module.exports = router;
