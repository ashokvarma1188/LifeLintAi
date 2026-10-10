const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireApproved } = require("../middleware/authMiddleware");
const { getProfile, updateProfile, exportMyData, deleteMyAccount, enableMedicalIdLink, disableMedicalIdLink, setOrganPledge } = require("../controllers/profileController");

router.get("/me", protect, requireApproved, getProfile);
router.put("/me", protect, requireApproved, updateProfile);
router.post("/medical-id-link", protect, requireApproved, enableMedicalIdLink);
router.delete("/medical-id-link", protect, requireApproved, disableMedicalIdLink);
router.put("/organ-pledge", protect, requireApproved, setOrganPledge);
router.get("/export", protect, requireApproved, exportMyData);
router.delete("/me", protect, deleteMyAccount);

module.exports = router;
