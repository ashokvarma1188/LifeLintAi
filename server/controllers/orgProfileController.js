const bcrypt = require("bcrypt");
const User = require("../models/User");
const { ORG_ROLES } = require("../constants/roles");

const shape = (user) => ({
  orgName: user.orgName || "",
  licenseNumber: user.licenseNumber || "",
  logoUrl: user.logoUrl || "",
  serviceRadiusKm: user.serviceRadiusKm ?? null,
  openHours: user.openHours || "",
  isOpen: user.isOpen !== false,
  phone: user.phone || "",
  verified: user.roleStatus === "approved",
  location: user.location?.coordinates ? { longitude: user.location.coordinates[0], latitude: user.location.coordinates[1] } : null,
});

const getOrgProfile = async (req, res) => {
  if (!ORG_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: "Organisation accounts only" });
  }
  res.json(shape(req.user));
};

/** Police/fire station/pharmacy set their own location this way (hospitals use their claimed Hospital record instead). */
const updateOrgLocation = async (req, res) => {
  try {
    if (!ORG_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Organisation accounts only" });
    }

    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: "A valid latitude and longitude are required" });
    }

    req.user.location = { type: "Point", coordinates: [longitude, latitude] };
    await req.user.save();

    res.json({ message: "Location updated", profile: shape(req.user) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const updateOrgProfile = async (req, res) => {
  try {
    if (!ORG_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Organisation accounts only" });
    }

    const { orgName, licenseNumber, logoUrl, serviceRadiusKm, openHours, isOpen, phone } = req.body;
    if (orgName !== undefined) req.user.orgName = String(orgName).trim();
    if (licenseNumber !== undefined) req.user.licenseNumber = String(licenseNumber).trim();
    if (logoUrl !== undefined) req.user.logoUrl = String(logoUrl).trim();
    if (serviceRadiusKm !== undefined) {
      const radius = Number(serviceRadiusKm);
      req.user.serviceRadiusKm = Number.isFinite(radius) && radius >= 0 ? radius : undefined;
    }
    if (openHours !== undefined) req.user.openHours = String(openHours).trim();
    if (isOpen !== undefined) req.user.isOpen = Boolean(isOpen);
    if (phone !== undefined) req.user.phone = String(phone).trim();

    await req.user.save();
    res.json({ message: "Organisation profile updated", profile: shape(req.user) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const staffCard = (u) => ({ id: u._id, name: u.name, email: u.email, createdAt: u.createdAt });

/** Staff accounts share the parent's role and org name, and are auto-approved — the parent org already went through admin review. */
const listStaff = async (req, res) => {
  if (!ORG_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: "Organisation accounts only" });
  }
  if (req.user.parentOrgId) {
    return res.status(403).json({ message: "Staff accounts cannot manage other staff" });
  }

  const staff = await User.find({ parentOrgId: req.user._id }).select("name email createdAt");
  res.json({ staff: staff.map(staffCard) });
};

const createStaff = async (req, res) => {
  try {
    if (!ORG_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "Organisation accounts only" });
    }
    if (req.user.parentOrgId) {
      return res.status(403).json({ message: "Staff accounts cannot create other staff" });
    }
    if (req.user.roleStatus !== "approved") {
      return res.status(403).json({ message: "Your organisation account must be approved first" });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalisedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalisedEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const staff = await User.create({
      name: String(name).trim(),
      email: normalisedEmail,
      password: await bcrypt.hash(password, 10),
      role: req.user.role,
      roleStatus: "approved",
      orgName: req.user.orgName,
      parentOrgId: req.user._id,
    });

    res.status(201).json({ message: "Staff account created", staff: staffCard(staff) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const removeStaff = async (req, res) => {
  try {
    if (!ORG_ROLES.includes(req.user.role) || req.user.parentOrgId) {
      return res.status(403).json({ message: "Organisation accounts only" });
    }

    const staff = await User.findOneAndDelete({ _id: req.params.id, parentOrgId: req.user._id });
    if (!staff) {
      return res.status(404).json({ message: "Staff account not found" });
    }

    res.json({ message: "Staff account removed" });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { getOrgProfile, updateOrgProfile, updateOrgLocation, listStaff, createStaff, removeStaff };
