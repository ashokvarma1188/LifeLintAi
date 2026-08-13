const mongoose = require("mongoose");

const RECORD_TYPES = [
  "consultation",
  "lab",
  "prescription",
  "scan",
  "discharge",
  "vaccination",
  "other",
];

const healthRecordSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    title: { type: String, required: true, trim: true },
    recordType: { type: String, enum: RECORD_TYPES, default: "other" },

    hospitalName: { type: String, trim: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    doctorName: { type: String, trim: true },

    // Stored as a plain date string ("2026-08-13") exactly as entered.
    recordDate: { type: String, required: true },

    bloodPressure: { type: String, trim: true },
    heartRate: { type: Number },
    bloodSugar: { type: Number },
    weight: { type: Number },

    notes: { type: String, trim: true },
    recommendations: { type: String, trim: true },

    // "self" when the patient adds it, "hospital" when staff do.
    createdBy: { type: String, enum: ["self", "hospital"], default: "self" },

    /*
     * The PDF lives in the document itself rather than on disk, which keeps
     * deploys stateless. Mongo caps a document at 16MB; uploads are limited to
     * 4MB in the route, well inside that.
     */
    pdf: {
      filename: { type: String },
      contentType: { type: String, default: "application/pdf" },
      size: { type: Number },
      data: { type: Buffer },
    },
  },
  { timestamps: true }
);

healthRecordSchema.index({ userId: 1, recordDate: -1 });

module.exports = mongoose.model("HealthRecord", healthRecordSchema);
module.exports.RECORD_TYPES = RECORD_TYPES;
