const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireApproved } = require("../middleware/authMiddleware");
const {
  createRequest,
  listForDonor,
  myRequests,
  respond,
  fulfilRequest,
  cancelRequest,
} = require("../controllers/bloodRequestController");

router.use(protect, requireApproved);

router.post("/", createRequest);
router.get("/for-donor", listForDonor);
router.get("/mine", myRequests);
router.patch("/:id/respond", respond);
router.patch("/:id/fulfil", fulfilRequest);
router.patch("/:id/cancel", cancelRequest);

module.exports = router;
