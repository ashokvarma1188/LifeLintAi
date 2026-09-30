const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireApproved } = require("../middleware/authMiddleware");
const { listPharmacies, createMedicineRequest, myRequests } = require("../controllers/pharmacyDirectoryController");

router.get("/", protect, requireApproved, listPharmacies);
router.get("/requests/mine", protect, requireApproved, myRequests);
router.post("/:id/requests", protect, requireApproved, createMedicineRequest);

module.exports = router;
