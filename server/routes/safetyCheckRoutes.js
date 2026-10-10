const express = require("express");
const router = express.Router();
const { protect, requireAdmin, requireApproved } = require("../middleware/authMiddleware");
const {
  createCheck, listChecks, getCheck, closeCheck, listActiveForMe, respond,
} = require("../controllers/safetyCheckController");

// Civilians: see active checks and answer them.
router.get("/active", protect, requireApproved, listActiveForMe);
router.post("/:id/respond", protect, requireApproved, respond);

// Admins: declare, watch and close.
router.get("/", protect, requireAdmin, listChecks);
router.post("/", protect, requireAdmin, createCheck);
router.get("/:id", protect, requireAdmin, getCheck);
router.post("/:id/close", protect, requireAdmin, closeCheck);

module.exports = router;
