const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Verifies the bearer token and loads the user onto the request.
 *
 * The user document (not just the id) is attached because every role guard
 * below needs to read role/roleStatus, and reading them from the database
 * rather than the token means an admin's approval takes effect immediately
 * instead of when the user's week-old token expires.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided, access denied" });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.userId = user._id;
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

/** Builds a guard for one organisation role, which must also be approved. */
const requireRole = (role, label) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res.status(403).json({ message: `${label} access required` });
  }
  if (req.user?.roleStatus !== "approved") {
    return res.status(403).json({ message: `Your ${label.toLowerCase()} account has not been approved yet` });
  }
  next();
};

const requireHospital = requireRole("hospital", "Hospital");

/** Blocks organisation accounts that are still pending or were rejected. */
const requireApproved = (req, res, next) => {
  if (req.user?.roleStatus === "pending") {
    return res.status(403).json({ message: "Your account is awaiting admin approval" });
  }
  if (req.user?.roleStatus === "rejected") {
    return res.status(403).json({ message: "Your account request was rejected" });
  }
  next();
};

module.exports = protect;
module.exports.protect = protect;
module.exports.requireAdmin = requireAdmin;
module.exports.requireRole = requireRole;
module.exports.requireHospital = requireHospital;
module.exports.requireApproved = requireApproved;
