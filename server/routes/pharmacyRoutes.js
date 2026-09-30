const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const { getStock, updateStock, updateAvailability, listRequests, fulfilRequest, declineRequest } = require("../controllers/pharmacyController");

const requirePharmacy = requireRole("pharmacy", "Pharmacy");

router.use(protect, requirePharmacy);

router.get("/stock", getStock);
router.put("/stock", updateStock);
router.put("/availability", updateAvailability);
router.get("/requests", listRequests);
router.patch("/requests/:id/fulfil", fulfilRequest);
router.patch("/requests/:id/decline", declineRequest);

module.exports = router;
