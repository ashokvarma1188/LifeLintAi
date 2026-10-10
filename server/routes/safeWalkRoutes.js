const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireApproved } = require("../middleware/authMiddleware");
const { startWalk, getCurrentWalk, updateLocation, extendWalk, markArrived, cancelWalk } = require("../controllers/safeWalkController");

router.post("/", protect, requireApproved, startWalk);
router.get("/current", protect, requireApproved, getCurrentWalk);
router.patch("/:id/location", protect, requireApproved, updateLocation);
router.post("/:id/extend", protect, requireApproved, extendWalk);
router.post("/:id/arrived", protect, requireApproved, markArrived);
router.post("/:id/cancel", protect, requireApproved, cancelWalk);

module.exports = router;
