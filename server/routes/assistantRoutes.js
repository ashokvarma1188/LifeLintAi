const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { chat } = require("../controllers/assistantController");

router.post("/chat", protect, chat);

module.exports = router;
