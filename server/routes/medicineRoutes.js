const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireApproved } = require("../middleware/authMiddleware");
const { listMedicines, createMedicine, updateMedicine, deleteMedicine, markTaken } = require("../controllers/medicineController");

router.get("/", protect, requireApproved, listMedicines);
router.post("/", protect, requireApproved, createMedicine);
router.put("/:id", protect, requireApproved, updateMedicine);
router.delete("/:id", protect, requireApproved, deleteMedicine);
router.post("/:id/taken", protect, requireApproved, markTaken);

module.exports = router;
