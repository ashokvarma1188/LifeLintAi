const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { VALID_ROLES, isCivilian, isOrgRole } = require("../constants/roles");
const { sendPasswordResetEmail, sendVerificationEmail, sendTwoFactorCode } = require("../utils/mailer");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const clientUrl = () => (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim();

/** Issues a fresh verification token for `user`, emails it (or returns the link if email isn't configured). */
const issueVerificationEmail = async (user) => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await user.save();

  const verifyUrl = `${clientUrl()}/verify-email/${rawToken}`;
  const { sent } = await sendVerificationEmail(user.email, verifyUrl);
  return { sent, verifyUrl };
};

const TOKEN_TTL = "7d";

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

/* Shape sent to the client. Never includes the password hash. */
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || "civilian",
  roleStatus: user.roleStatus || "approved",
  orgName: user.orgName || null,
  licenseNumber: user.licenseNumber || null,
  bloodGroup: user.bloodGroup,
  phone: user.phone,
  suspended: Boolean(user.suspended),
  emailVerified: Boolean(user.emailVerified),
  twoFactorEnabled: Boolean(user.twoFactorEnabled),
  hasVerificationDoc: Boolean(user.verificationDoc?.filename),
  isDemo: Boolean(user.isDemo),
  twoFactorMandatory: twoFactorIsMandatory(user),
});

const register = async (req, res) => {
  try {
    const { name, email, password, bloodGroup, phone } = req.body;
    const role = (req.body.role || "civilian").trim().toLowerCase();
    const orgName = (req.body.orgName || "").trim();
    const licenseNumber = (req.body.licenseNumber || "").trim();

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
      licenseNumber: licenseNumber || undefined,
      bloodGroup,
      phone,
      verificationDoc: req.file
        ? { filename: req.file.originalname, contentType: req.file.mimetype, size: req.file.size, data: req.file.buffer }
        : undefined,
    });

    const { sent, verifyUrl } = await issueVerificationEmail(user);

    res.status(201).json({
      message:
        roleStatus === "pending"
          ? "Account created. An admin will review your organization request."
          : "User registered successfully",
      token: signToken(user),
      user: publicUser(user),
      // Same dev-mode fallback as forgot-password — remove once email is configured.
      ...(sent ? {} : { verifyUrl }),
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

    if (user.suspended) {
      return res.status(403).json({ message: "Your account has been suspended. Contact support if you think this is a mistake." });
    }

    // Accounts created before roles existed are backfilled on first login.
    if (!user.roleStatus) {
      user.role = user.role || "civilian";
      user.roleStatus = "approved";
      await user.save();
    }

    if (user.twoFactorEnabled) {
      const code = generateOtp();
      user.twoFactorCode = hashToken(code);
      user.twoFactorCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      const { sent } = await sendTwoFactorCode(user.email, code);

      return res.json({
        requires2FA: true,
        userId: user._id,
        message: "Enter the 6-digit code sent to your email to finish signing in.",
        // Dev-mode fallback, same pattern as the other flows — remove once email is configured.
        ...(sent ? {} : { devCode: code }),
      });
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

const verifyTwoFactor = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ message: "userId and code are required" });
    }

    const user = await User.findOne({
      _id: userId,
      twoFactorCode: hashToken(String(code)),
      twoFactorCodeExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "That code is invalid or has expired" });
    }

    user.twoFactorCode = undefined;
    user.twoFactorCodeExpires = undefined;
    await user.save();

    res.json({
      message: "Login successful",
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Toggling is immediate — no separate enrolment step, kept deliberately simple. */
/** Agency and admin accounts are required to keep 2FA on — the demo account is exempt. */
const twoFactorIsMandatory = (user) => (isOrgRole(user.role) || user.role === "admin") && !user.isDemo;

const setTwoFactor = async (req, res) => {
  try {
    const enable = Boolean(req.body.enable);
    if (!enable && twoFactorIsMandatory(req.user)) {
      return res.status(400).json({ message: "Two-factor authentication is required for your account type and can't be turned off." });
    }

    req.user.twoFactorEnabled = enable;
    await req.user.save();
    res.json({
      message: req.user.twoFactorEnabled ? "Two-factor authentication enabled." : "Two-factor authentication disabled.",
      twoFactorEnabled: req.user.twoFactorEnabled,
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/** Bumping tokenVersion makes every previously issued JWT fail the check in authMiddleware. */
const logoutEverywhere = async (req, res) => {
  try {
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    res.json({ message: "Signed out of all devices. Please log in again." });
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

const DEMO_SWITCHABLE_ROLES = ["civilian", "hospital", "police", "firestation", "pharmacy", "admin"];
const DEMO_ORG_NAMES = {
  hospital: "Demo Hospital",
  police: "Demo Police Department",
  firestation: "Demo Fire Station",
  pharmacy: "Demo Pharmacy",
};

/**
 * Instantly switches role with no pending/approval step — only for the one
 * hand-seeded demo account (isDemo: true), so a single login can walk through
 * every dashboard for a demo/interview. Every other account still goes
 * through requestRoleChange above and needs admin approval.
 */
const demoSwitchRole = async (req, res) => {
  try {
    if (!req.user.isDemo) {
      return res.status(403).json({ message: "This account cannot switch roles instantly" });
    }

    const role = (req.body.role || "").trim().toLowerCase();
    if (!DEMO_SWITCHABLE_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = req.user;
    user.role = role;
    user.roleStatus = "approved";
    user.orgName = DEMO_ORG_NAMES[role] || undefined;
    await user.save();

    res.json({ message: `Switched to ${role}`, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

/**
 * Always responds the same way whether or not the email exists, so a caller
 * can't use this to probe which emails are registered.
 */
const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const genericMessage = "If an account exists for that email, a reset link has been sent.";
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${clientUrl()}/reset-password/${rawToken}`;

    const { sent } = await sendPasswordResetEmail(user.email, resetUrl);

    res.json({
      message: genericMessage,
      // Email isn't configured on this deployment yet — hand back the link
      // directly so the flow is still testable end to end. Remove this once
      // EMAIL_USER/EMAIL_PASS are set, so the link is never exposed over the API.
      ...(sent ? {} : { resetUrl }),
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "This reset link is invalid or has expired" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully. You can now sign in." });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: hashToken(token),
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "This verification link is invalid or has expired" });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully." });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const resendVerification = async (req, res) => {
  try {
    if (req.user.emailVerified) {
      return res.status(400).json({ message: "Your email is already verified" });
    }

    const { sent, verifyUrl } = await issueVerificationEmail(req.user);

    res.json({
      message: "Verification email sent.",
      ...(sent ? {} : { verifyUrl }),
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

module.exports = {
  register,
  login,
  verifyTwoFactor,
  setTwoFactor,
  logoutEverywhere,
  me,
  requestRoleChange,
  demoSwitchRole,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  publicUser,
};
