const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { createSOS } = require("../controllers/sosController");

router.post("/", protect, createSOS);

module.exports = router;
