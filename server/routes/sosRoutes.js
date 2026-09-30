const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireHospital, requireApproved } = require("../middleware/authMiddleware");
const { createSOS, listSOS, myRequests, cancelSOS, acceptSOS, declineSOS, resolveSOS } = require("../controllers/sosController");

router.post("/", protect, requireApproved, createSOS);
router.get("/mine", protect, requireApproved, myRequests);
router.patch("/:id/cancel", protect, requireApproved, cancelSOS);

// Accept/decline/resolve are open to any approved responder role — the controller
// checks the request actually targets that responder's own service.
router.patch("/:id/accept", protect, requireApproved, acceptSOS);
router.patch("/:id/decline", protect, requireApproved, declineSOS);
router.patch("/:id/resolve", protect, requireApproved, resolveSOS);

router.get("/", protect, requireHospital, listSOS);

module.exports = router;
