const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireApproved } = require("../middleware/authMiddleware");
const { getPublicKey, subscribe, unsubscribe, sendTest } = require("../controllers/pushController");

router.get("/public-key", getPublicKey);
router.post("/subscribe", protect, requireApproved, subscribe);
router.delete("/subscribe", protect, unsubscribe);
router.post("/test", protect, requireApproved, sendTest);

module.exports = router;
