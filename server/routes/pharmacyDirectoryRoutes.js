const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { listPharmacies, createMedicineRequest, myRequests } = require("../controllers/pharmacyDirectoryController");

router.get("/", protect, listPharmacies);
router.get("/requests/mine", protect, myRequests);
router.post("/:id/requests", protect, createMedicineRequest);

module.exports = router;
