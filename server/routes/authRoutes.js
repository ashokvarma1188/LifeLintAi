const express = require("express");
const router = express.Router();
const {
  register,
  login,
  verifyTwoFactor,
  setTwoFactor,
  logoutEverywhere,
  me,
  requestRoleChange,
  demoSwitchRole,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const { uploadPdf } = require("../middleware/uploadMiddleware");

router.post("/register", uploadPdf, register);
router.post("/login", login);
router.post("/verify-2fa", verifyTwoFactor);
router.post("/2fa", protect, setTwoFactor);
router.post("/logout-everywhere", protect, logoutEverywhere);
router.get("/me", protect, me);
router.post("/request-role-change", protect, requestRoleChange);
router.post("/demo-switch-role", protect, demoSwitchRole);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/verify-email/:token", verifyEmail);
router.post("/resend-verification", protect, resendVerification);

module.exports = router;
