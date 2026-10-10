const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireHospital, requireApproved } = require("../middleware/authMiddleware");
const { uploadSosMedia } = require("../middleware/uploadMiddleware");
const { listMessages, postText, postMedia, getMessageFile } = require("../controllers/sosChatController");
const { createSOS, listSOS, myRequests, cancelSOS, updateLocation, updateResponderLocation, getMyAnalytics, acceptSOS, declineSOS, enRouteSOS, resolveSOS } = require("../controllers/sosController");

router.post("/", protect, requireApproved, createSOS);
router.get("/mine", protect, requireApproved, myRequests);
router.patch("/:id/cancel", protect, requireApproved, cancelSOS);
router.patch("/:id/location", protect, requireApproved, updateLocation);
router.patch("/responder-location", protect, requireApproved, updateResponderLocation);

// SOS chat: text, scene photos and voice notes between the civilian and the responders.
router.get("/messages/:messageId/file", protect, requireApproved, getMessageFile);
router.get("/:id/messages", protect, requireApproved, listMessages);
router.post("/:id/messages", protect, requireApproved, postText);
router.post("/:id/messages/media", protect, requireApproved, uploadSosMedia, postMedia);

// Accept/decline/resolve are open to any approved responder role — the controller
// checks the request actually targets that responder's own service.
router.patch("/:id/accept", protect, requireApproved, acceptSOS);
router.patch("/:id/decline", protect, requireApproved, declineSOS);
router.patch("/:id/en-route", protect, requireApproved, enRouteSOS);
router.patch("/:id/resolve", protect, requireApproved, resolveSOS);

router.get("/", protect, requireHospital, listSOS);
router.get("/my-analytics", protect, requireApproved, getMyAnalytics);

module.exports = router;
