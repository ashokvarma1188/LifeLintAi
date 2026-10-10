const mongoose = require("mongoose");
const MedicineReminder = require("../models/MedicineReminder");
const { istNow } = require("../utils/istTime");

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const KEEP_TAKEN = 200;
const MAX_MEDICINES = 30;

const clean = (body) => ({
  name: String(body.name || "").trim().slice(0, 80),
  dose: String(body.dose || "").trim().slice(0, 60),
  notes: String(body.notes || "").trim().slice(0, 200),
  times: [...new Set((Array.isArray(body.times) ? body.times : []).map(String).filter((t) => TIME.test(t)))].sort(),
});

const validate = (data) => {
  if (!data.name) return "Enter the medicine name.";
  if (!data.times.length) return "Add at least one time.";
  if (data.times.length > 6) return "Add up to 6 times a day.";
  return null;
};

const listMedicines = async (req, res) => {
  try {
    const items = await MedicineReminder.find({ userId: req.userId }).sort({ createdAt: 1 });
    res.json({ medicines: items, today: istNow().date });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const createMedicine = async (req, res) => {
  try {
    const data = clean(req.body || {});
    const problem = validate(data);
    if (problem) return res.status(400).json({ message: problem });
    if ((await MedicineReminder.countDocuments({ userId: req.userId })) >= MAX_MEDICINES) {
      return res.status(400).json({ message: "You can keep up to 30 medicines." });
    }
    const item = await MedicineReminder.create({ ...data, userId: req.userId });
    res.status(201).json({ medicine: item });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Pause/resume (`active`) or edit name, dose, notes and times. */
const updateMedicine = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
    const body = req.body || {};
    const update = {};
    if ("active" in body) update.active = Boolean(body.active);
    if ("name" in body || "times" in body) {
      const data = clean(body);
      const problem = validate(data);
      if (problem) return res.status(400).json({ message: problem });
      Object.assign(update, data);
    }
    const item = await MedicineReminder.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, update, { new: true });
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json({ medicine: item });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const deleteMedicine = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
    await MedicineReminder.deleteOne({ _id: req.params.id, userId: req.userId });
    res.json({ message: "Medicine removed" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Ticks (or un-ticks, with `taken: false`) one of today's doses. */
const markTaken = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
    const time = String(req.body?.time || "");
    if (!TIME.test(time)) return res.status(400).json({ message: "Invalid time" });
    const item = await MedicineReminder.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ message: "Not found" });
    if (!item.times.includes(time)) return res.status(400).json({ message: "That time is not in this schedule." });
    const key = `${istNow().date} ${time}`;
    const taken = item.taken.filter((k) => k !== key);
    if (req.body?.taken !== false) taken.push(key);
    item.taken = taken.slice(-KEEP_TAKEN);
    await item.save();
    res.json({ medicine: item });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { listMedicines, createMedicine, updateMedicine, deleteMedicine, markTaken };
