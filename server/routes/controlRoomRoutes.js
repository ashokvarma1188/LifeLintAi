const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getControlRoom, requireControlRoomAccess } = require("../controllers/controlRoomController");

router.get("/", protect, requireControlRoomAccess, getControlRoom);

module.exports = router;
