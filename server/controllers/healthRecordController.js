const mongoose = require("mongoose");
const HealthRecord = require("../models/HealthRecord");
const { RECORD_TYPES } = require("../models/HealthRecord");

/** Optional numeric form fields arrive as strings; blanks mean "not recorded". */
const parseOptionalNumber = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const trimmed = (value) => (value === undefined || value === null ? "" : String(value).trim());

/** JSON-safe record. The PDF bytes are replaced by metadata. */
const serialize = (record) => ({
  id: record._id,
  userId: record.userId,
  title: record.title || "",
  recordType: record.recordType || "other",
  hospitalName: record.hospitalName || "",
  hospitalId: record.hospitalId || null,
  doctorName: record.doctorName || "",
  recordDate: record.recordDate || "",
  bloodPressure: record.bloodPressure || "",
  heartRate: record.heartRate ?? null,
  bloodSugar: record.bloodSugar ?? null,
  weight: record.weight ?? null,
  notes: record.notes || "",
  recommendations: record.recommendations || "",
  createdBy: record.createdBy || "self",
  pdf: record.pdf?.filename
    ? {
        filename: record.pdf.filename,
        contentType: record.pdf.contentType || "application/pdf",
        size: record.pdf.size || 0,
      }
    : null,
  hasPdf: Boolean(record.pdf?.filename),
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

/** Shared field mapping for create and update. */
const readRecordFields = (body) => {
  const recordType = trimmed(body.recordType).toLowerCase();

  return {
    title: trimmed(body.title),
    recordType: RECORD_TYPES.includes(recordType) ? recordType : "other",
    doctorName: trimmed(body.doctorName),
    recordDate: trimmed(body.recordDate),
    bloodPressure: trimmed(body.bloodPressure),
    heartRate: parseOptionalNumber(body.heartRate),
    bloodSugar: parseOptionalNumber(body.bloodSugar),
    weight: parseOptionalNumber(body.weight),
    notes: trimmed(body.notes),
    recommendations: trimmed(body.recommendations),
  };
};

/** Turns an uploaded file into the embedded pdf sub-document. */
const readPdf = (file) => {
  if (!file) return undefined;
  return {
    filename: file.originalname,
    contentType: file.mimetype || "application/pdf",
    size: file.size,
    data: file.buffer,
  };
};

const validate = (fields) => {
  if (!fields.title) return "Report title is required";
  if (!fields.recordDate) return "Report date is required";
  return null;
};

/** Owner always; the hospital that created the record may also read it. */
const canAccess = (record, user) =>
  String(record.userId) === String(user._id) ||
  (record.hospitalId && String(record.hospitalId) === String(user._id));

const createRecord = async (req, res) => {
  try {
    const fields = readRecordFields(req.body);
    const problem = validate(fields);
    if (problem) return res.status(400).json({ message: problem });

    const record = await HealthRecord.create({
      ...fields,
      userId: req.user._id,
      hospitalName: trimmed(req.body.hospitalName),
      createdBy: "self",
      pdf: readPdf(req.file),
    });

    res.status(201).json({
      message: "Medical report added successfully",
      pdfUploaded: Boolean(req.file),
      record: serialize(record),
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const getRecords = async (req, res) => {
  try {
    const query = { userId: req.user._id };

    const type = trimmed(req.query.recordType).toLowerCase();
    if (type && RECORD_TYPES.includes(type)) query.recordType = type;

    const search = trimmed(req.query.search);
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: { $regex: safe, $options: "i" } },
        { hospitalName: { $regex: safe, $options: "i" } },
        { doctorName: { $regex: safe, $options: "i" } },
      ];
    }

    // Exclude the binary so a list of reports stays small.
    const records = await HealthRecord.find(query)
      .select("-pdf.data")
      .sort({ recordDate: -1, createdAt: -1 });

    res.json({ records: records.map(serialize) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const getRecord = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.recordId)) {
      return res.status(404).json({ message: "Record not found" });
    }

    const record = await HealthRecord.findById(req.params.recordId).select("-pdf.data");
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (!canAccess(record, req.user)) {
      return res.status(403).json({ message: "You cannot view this record" });
    }

    res.json({ record: serialize(record) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const getRecordPdf = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.recordId)) {
      return res.status(404).json({ message: "Record not found" });
    }

    const record = await HealthRecord.findById(req.params.recordId);
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (!canAccess(record, req.user)) {
      return res.status(403).json({ message: "You cannot view this record" });
    }
    if (!record.pdf?.data) {
      return res.status(404).json({ message: "This record has no PDF attached" });
    }

    res.setHeader("Content-Type", record.pdf.contentType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${(record.pdf.filename || "report.pdf").replace(/"/g, "")}"`
    );
    res.send(record.pdf.data);
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const updateRecord = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.recordId)) {
      return res.status(404).json({ message: "Record not found" });
    }

    const record = await HealthRecord.findById(req.params.recordId);
    if (!record) return res.status(404).json({ message: "Record not found" });

    // Editing is owner-only — a hospital may add records but not rewrite them.
    if (String(record.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You cannot edit this record" });
    }

    const fields = readRecordFields(req.body);
    const problem = validate(fields);
    if (problem) return res.status(400).json({ message: problem });

    Object.assign(record, fields);
    if (req.body.hospitalName !== undefined) {
      record.hospitalName = trimmed(req.body.hospitalName);
    }

    const pdf = readPdf(req.file);
    if (pdf) record.pdf = pdf;
    if (String(req.body.removePdf) === "true") record.pdf = undefined;

    await record.save();

    res.json({ message: "Medical report updated", record: serialize(record) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const deleteRecord = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.recordId)) {
      return res.status(404).json({ message: "Record not found" });
    }

    const record = await HealthRecord.findById(req.params.recordId);
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (String(record.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You cannot delete this record" });
    }

    await record.deleteOne();
    res.json({ message: "Medical report deleted" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const recordStats = async (req, res) => {
  try {
    const records = await HealthRecord.find({ userId: req.user._id }).select(
      "recordType recordDate heartRate bloodSugar weight bloodPressure pdf.filename"
    );

    const byType = {};
    records.forEach((r) => {
      const key = r.recordType || "other";
      byType[key] = (byType[key] || 0) + 1;
    });

    // Records are sorted newest-first so the first hit is the latest reading.
    const sorted = [...records].sort((a, b) =>
      String(b.recordDate).localeCompare(String(a.recordDate))
    );
    const latestOf = (field) => sorted.find((r) => r[field] !== undefined && r[field] !== null && r[field] !== "")?.[field] ?? null;

    res.json({
      total: records.length,
      withPdf: records.filter((r) => r.pdf?.filename).length,
      byType,
      lastRecordDate: sorted[0]?.recordDate || null,
      latest: {
        heartRate: latestOf("heartRate"),
        bloodSugar: latestOf("bloodSugar"),
        weight: latestOf("weight"),
        bloodPressure: latestOf("bloodPressure"),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = {
  createRecord,
  getRecords,
  getRecord,
  getRecordPdf,
  updateRecord,
  deleteRecord,
  recordStats,
  serialize,
  readRecordFields,
  readPdf,
  validate,
  trimmed,
};
