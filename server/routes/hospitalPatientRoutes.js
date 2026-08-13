const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireHospital } = require("../middleware/authMiddleware");
const { uploadPdf } = require("../middleware/uploadMiddleware");
const {
  searchPatient,
  getPatient,
  getPatientRecords,
  createPatientRecord,
} = require("../controllers/hospitalPatientController");

router.use(protect, requireHospital);

// Declared before "/:patientId" so "search" is not read as a patient id.
router.get("/search", searchPatient);

router.get("/:patientId", getPatient);
router.get("/:patientId/records", getPatientRecords);
router.post("/:patientId/records", uploadPdf, createPatientRecord);

module.exports = router;
