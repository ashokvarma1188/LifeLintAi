/*
 * The Express app (middleware + routes) without starting a server or connecting
 * to the database — server.js does that, and the tests load this file directly.
 */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const sosRoutes = require("./routes/sosRoutes");
const adminRoutes = require("./routes/adminRoutes");
const healthRecordRoutes = require("./routes/healthRecordRoutes");
const hospitalPatientRoutes = require("./routes/hospitalPatientRoutes");
const policeRoutes = require("./routes/policeRoutes");
const firestationRoutes = require("./routes/firestationRoutes");
const pharmacyRoutes = require("./routes/pharmacyRoutes");
const assistantRoutes = require("./routes/assistantRoutes");
const donorRoutes = require("./routes/donorRoutes");
const pharmacyDirectoryRoutes = require("./routes/pharmacyDirectoryRoutes");
const orgProfileRoutes = require("./routes/orgProfileRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const emergencyServicesRoutes = require("./routes/emergencyServicesRoutes");
const bloodRequestRoutes = require("./routes/bloodRequestRoutes");
const supportRoutes = require("./routes/supportRoutes");
const publicRoutes = require("./routes/publicRoutes");
const pushRoutes = require("./routes/pushRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const safeWalkRoutes = require("./routes/safeWalkRoutes");
const controlRoomRoutes = require("./routes/controlRoomRoutes");
const safetyCheckRoutes = require("./routes/safetyCheckRoutes");
const campRoutes = require("./routes/campRoutes");
const courseRoutes = require("./routes/courseRoutes");
const certificateRoutes = require("./routes/certificateRoutes");

// Automated tests fire many requests from one address — rate limits would only get in their way.
const isTest = process.env.NODE_ENV === "test";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());

/*
 * In development every origin is allowed. In production set CLIENT_URL to the
 * deployed frontend (comma-separated if there is more than one) so the API is
 * not open to every site on the internet.
 */
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
);

app.use(express.json());

/* Generous ceiling against runaway abuse — most real traffic never gets close. */
app.use(
  "/api",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false, skip: () => isTest })
);

/* Login/register/password-reset are brute-force targets — a much tighter cap. */
const authLimiter = rateLimit({
  skip: () => isTest,
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

app.get("/", (req, res) => {
  res.send("LifeLink AI backend is running!");
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/google", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
// A 6-digit OTP is brute-forceable in far fewer than 300 tries (the general
// /api cap) — give it the same tight ceiling as login.
app.use("/api/auth/verify-2fa", authLimiter);
app.use("/api/auth/resend-verification", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/health-records", healthRecordRoutes);
app.use("/api/hospital/patients", hospitalPatientRoutes);
app.use("/api/police", policeRoutes);
app.use("/api/firestation", firestationRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/pharmacies", pharmacyDirectoryRoutes);
app.use("/api/org-profile", orgProfileRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/emergency-services", emergencyServicesRoutes);
app.use("/api/blood-requests", bloodRequestRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/walks", safeWalkRoutes);
app.use("/api/control-room", controlRoomRoutes);
app.use("/api/safety-checks", safetyCheckRoutes);
app.use("/api/camps", campRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/certificates", certificateRoutes);

module.exports = app;
