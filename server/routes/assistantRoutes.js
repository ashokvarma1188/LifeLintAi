const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { uploadPhoto } = require("../middleware/uploadMiddleware");
const { chat } = require("../controllers/assistantController");

router.post("/chat", protect, uploadPhoto, chat);

module.exports = router;
