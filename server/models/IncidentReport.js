const mongoose = require("mongoose");

/* Shared by police and fire station — both file the same shape of report. */
const incidentReportSchema = new mongoose.Schema(
  {
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: String, enum: ["police", "firestation"], required: true },
    relatedRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "EmergencyRequest" },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("IncidentReport", incidentReportSchema);
