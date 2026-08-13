const express = require("express");
const router = express.Router();
const { register, login, me, requestRoleChange } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.post("/request-role-change", protect, requestRoleChange);

module.exports = router;
