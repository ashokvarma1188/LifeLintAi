const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { uploadPhoto, uploadReport } = require("../middleware/uploadMiddleware");
const { chat } = require("../controllers/assistantController");
const { explainReport, checkSymptoms } = require("../controllers/aiHealthController");

/* Every AI call costs money: a fair-use cap per person for the report reader and symptom checker. */
const aiToolLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => String(req.userId),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { message: "You've used the AI tools a lot just now. Please try again in a few minutes." },
});

router.post("/chat", protect, uploadPhoto, chat);
router.post("/report", protect, aiToolLimiter, uploadReport, explainReport);
router.post("/triage", protect, aiToolLimiter, checkSymptoms);

module.exports = router;
