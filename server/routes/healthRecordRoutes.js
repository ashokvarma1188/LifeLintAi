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
  getAccessLog,
} = require("../controllers/healthRecordController");

router.use(protect, requireApproved);

// Declared before "/:recordId" so these aren't read as a record id.
router.get("/stats/summary", recordStats);
router.get("/access-log", getAccessLog);

router.post("/", uploadPdf, createRecord);
router.get("/", getRecords);
router.get("/:recordId", getRecord);
router.get("/:recordId/pdf", getRecordPdf);
router.put("/:recordId", uploadPdf, updateRecord);
router.delete("/:recordId", deleteRecord);

module.exports = router;
