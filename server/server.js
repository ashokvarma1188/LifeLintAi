require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
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

const app = express();

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

app.get("/", (req, res) => {
  res.send("LifeLink AI backend is running!");
});

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

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection failed:", err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
