const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { requireApproved } = require("../middleware/authMiddleware");
const { uploadPdf } = require("../middleware/uploadMiddleware");
const {
  createRecord,
  getRecords,
  getRecord,
  getRecordPdf,
  updateRecord,
  deleteRecord,
  recordStats,
} = require("../controllers/healthRecordController");

router.use(protect, requireApproved);

// Declared before "/:recordId" so "stats" is not read as a record id.
router.get("/stats/summary", recordStats);

router.post("/", uploadPdf, createRecord);
router.get("/", getRecords);
router.get("/:recordId", getRecord);
router.get("/:recordId/pdf", getRecordPdf);
router.put("/:recordId", uploadPdf, updateRecord);
router.delete("/:recordId", deleteRecord);

module.exports = router;
