const mongoose = require("mongoose");
const User = require("../models/User");
const HealthRecord = require("../models/HealthRecord");
const { CIVILIAN_ROLES } = require("../constants/roles");
const {
  serialize,
  readRecordFields,
  readPdf,
  validate,
  trimmed,
} = require("./healthRecordController");

/** Digits only, so +91 98765 43210 and 9876543210 compare equal. */
const normalizePhone = (value) => (value ? String(value).replace(/\D/g, "") : "");

/* Patients are civilians. Older accounts predate the role field entirely. */
const civilianFilter = {
  $or: [{ role: { $in: CIVILIAN_ROLES } }, { role: { $exists: false } }],
};

const patientCard = (patient) => ({
  id: patient._id,
  name: patient.name,
  email: patient.email,
  phone: patient.phone,
  bloodGroup: patient.bloodGroup || null,
  age: patient.age ?? null,
  allergies: patient.allergies || [],
  medicalHistory: patient.medicalHistory || [],
});

/**
 * Finds a patient by phone number.
 *
 * Tries the common stored formats first, then falls back to comparing the last
 * ten digits of every civilian's number — which catches spacing and country
 * codes that an exact match would miss.
 */
const searchPatient = async (req, res) => {
  try {
    const phone = normalizePhone(req.query.phone);

    if (phone.length < 10) {
      return res.status(400).json({ message: "Enter a valid patient phone number" });
    }

    const lastTen = phone.slice(-10);
    const candidates = [phone, lastTen, `+91${lastTen}`, `91${lastTen}`];

    let patient = await User.findOne({ ...civilianFilter, phone: { $in: candidates } }).select(
      "-password"
    );

    if (!patient) {
      const withPhone = await User.find({ ...civilianFilter, phone: { $exists: true, $ne: null } })
        .select("-password")
        .limit(2000);

      patient = withPhone.find((c) => normalizePhone(c.phone).slice(-10) === lastTen) || null;
    }

    if (!patient) {
      return res.status(404).json({ message: "No LifeLink patient was found with this phone number" });
    }

    res.json({ patient: patientCard(patient) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const findPatientOr404 = async (patientId, res) => {
  if (!mongoose.isValidObjectId(patientId)) {
    res.status(404).json({ message: "Patient not found" });
    return null;
  }
  const patient = await User.findOne({ _id: patientId, ...civilianFilter }).select("-password");
  if (!patient) {
    res.status(404).json({ message: "Patient not found" });
    return null;
  }
  return patient;
};

const getPatient = async (req, res) => {
  try {
    const patient = await findPatientOr404(req.params.patientId, res);
    if (!patient) return;
    res.json({ patient: patientCard(patient) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const getPatientRecords = async (req, res) => {
  try {
    const patient = await findPatientOr404(req.params.patientId, res);
    if (!patient) return;

    const records = await HealthRecord.find({ userId: patient._id })
      .select("-pdf.data")
      .sort({ recordDate: -1, createdAt: -1 });

    res.json({ patient: patientCard(patient), records: records.map(serialize) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Hospital staff filing a report against a patient's file. */
const createPatientRecord = async (req, res) => {
  try {
    const patient = await findPatientOr404(req.params.patientId, res);
    if (!patient) return;

    const fields = readRecordFields(req.body);
    const problem = validate(fields);
    if (problem) return res.status(400).json({ message: problem });

    const record = await HealthRecord.create({
      ...fields,
      userId: patient._id,
      hospitalId: req.user._id,
      hospitalName: trimmed(req.body.hospitalName) || req.user.orgName || req.user.name || "LifeLink Hospital",
      createdBy: "hospital",
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

module.exports = { searchPatient, getPatient, getPatientRecords, createPatientRecord };
