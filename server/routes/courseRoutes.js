const express = require("express");
const router = express.Router();
const { protect, requireApproved } = require("../middleware/authMiddleware");
const { getQuiz, getStatus, submitQuiz } = require("../controllers/courseController");

router.get("/quiz", protect, requireApproved, getQuiz);
router.get("/status", protect, requireApproved, getStatus);
router.post("/submit", protect, requireApproved, submitQuiz);

module.exports = router;
