const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { VALID_ROLES, isCivilian } = require("../constants/roles");

const TOKEN_TTL = "7d";

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });

/* Shape sent to the client. Never includes the password hash. */
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || "civilian",
  roleStatus: user.roleStatus || "approved",
  orgName: user.orgName || null,
  bloodGroup: user.bloodGroup,
  phone: user.phone,
});

const register = async (req, res) => {
  try {
    const { name, email, password, bloodGroup, phone } = req.body;
    const role = (req.body.role || "civilian").trim().toLowerCase();
    const orgName = (req.body.orgName || "").trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!isCivilian(role) && !orgName) {
      return res.status(400).json({ message: "Organization name is required for this role" });
    }

    const normalisedEmail = String(email).trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalisedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Only civilians get in straight away; organisations wait for an admin.
    const roleStatus = isCivilian(role) ? "approved" : "pending";

    const user = await User.create({
      name: String(name).trim(),
      email: normalisedEmail,
      password: hashedPassword,
      role,
      roleStatus,
      orgName: orgName || undefined,
      bloodGroup,
      phone,
    });

    res.status(201).json({
      message:
        roleStatus === "pending"
          ? "Account created. An admin will review your organization request."
          : "User registered successfully",
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Accounts created before roles existed are backfilled on first login.
    if (!user.roleStatus) {
      user.role = user.role || "civilian";
      user.roleStatus = "approved";
      await user.save();
    }

    res.json({
      message: "Login successful",
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/* Lets the client confirm a stored token is still valid on boot. */
const me = async (req, res) => {
  res.json({ user: publicUser(req.user) });
};

/**
 * Asks to switch role. Civilian is granted immediately; anything else drops
 * the account back to pending until an admin approves it.
 */
const requestRoleChange = async (req, res) => {
  try {
    const role = (req.body.role || "").trim().toLowerCase();
    const orgName = (req.body.orgName || "").trim();

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!isCivilian(role) && !orgName) {
      return res.status(400).json({ message: "Organization name is required for this role" });
    }

    const user = req.user;

    if (user.role === role && user.roleStatus === "approved") {
      return res.status(400).json({ message: "You already have this role" });
    }

    user.role = role;
    user.roleStatus = isCivilian(role) ? "approved" : "pending";
    if (orgName) user.orgName = orgName;
    await user.save();

    res.json({
      message: isCivilian(role)
        ? "Your account is now a civilian account."
        : "Request submitted. An admin will review it shortly.",
      user: publicUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = { register, login, me, requestRoleChange, publicUser };
