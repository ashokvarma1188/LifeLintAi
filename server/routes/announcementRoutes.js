const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { listActive } = require("../controllers/announcementController");

router.get("/", protect, listActive);

module.exports = router;
