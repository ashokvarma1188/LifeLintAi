const mongoose = require("mongoose");

/** A medicine the user takes on a daily schedule, e.g. "Metformin 500 mg" at 08:00 and 20:00 (India time). */
const medicineReminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    dose: { type: String, trim: true, maxlength: 60 },
    times: {
      type: [{ type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ }],
      validate: { validator: (arr) => arr.length > 0 && arr.length <= 6, message: "Add between 1 and 6 times" },
    },
    notes: { type: String, trim: true, maxlength: 200 },
    active: { type: Boolean, default: true },
    // "YYYY-MM-DD HH:MM" doses marked as taken (kept short — only recent days matter).
    taken: { type: [String], default: [] },
    // Last "YYYY-MM-DD HH:MM" a notification went out for, so each dose is sent once.
    lastNotified: { type: String },
  },
  { timestamps: true }
);

medicineReminderSchema.index({ active: 1, times: 1 });

module.exports = mongoose.model("MedicineReminder", medicineReminderSchema);
