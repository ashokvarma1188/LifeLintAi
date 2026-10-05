const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireApproved, requireAdmin } = require("../middleware/authMiddleware");
const {
  createTicket,
  myTickets,
  listAllTickets,
  getTicket,
  replyToTicket,
  closeTicket,
} = require("../controllers/supportController");

router.use(protect, requireApproved);

router.post("/tickets", createTicket);
router.get("/tickets/mine", myTickets);
router.get("/tickets/all", requireAdmin, listAllTickets);
router.get("/tickets/:id", getTicket);
router.post("/tickets/:id/reply", replyToTicket);
router.patch("/tickets/:id/close", closeTicket);

module.exports = router;
