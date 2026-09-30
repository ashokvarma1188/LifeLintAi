const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireHospital } = require("../middleware/authMiddleware");
const { createSOS, listSOS, myRequests, cancelSOS, acceptSOS, declineSOS, resolveSOS } = require("../controllers/sosController");

router.post("/", protect, createSOS);
router.get("/mine", protect, myRequests);
router.patch("/:id/cancel", protect, cancelSOS);

// Accept/decline/resolve are open to any responder role — the controller checks the
// request actually targets that responder's own service.
router.patch("/:id/accept", protect, acceptSOS);
router.patch("/:id/decline", protect, declineSOS);
router.patch("/:id/resolve", protect, resolveSOS);

router.get("/", protect, requireHospital, listSOS);

module.exports = router;
