const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/authMiddleware");
const { listPending, listAll, approveUser, rejectUser } = require("../controllers/adminController");

router.use(protect, requireAdmin);

router.get("/pending", listPending);
router.get("/all", listAll);
router.post("/approve/:userId", approveUser);
router.post("/reject/:userId", rejectUser);

module.exports = router;
