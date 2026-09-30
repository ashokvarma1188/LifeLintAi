const mongoose = require("mongoose");

/** One entry per time a hospital views or adds to a patient's health records. */
const recordAccessLogSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: ["viewed", "created"], required: true },
    recordId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthRecord" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecordAccessLog", recordAccessLogSchema);
