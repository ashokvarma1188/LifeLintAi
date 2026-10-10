require("dotenv").config();
const dns = require("dns");
// Render's containers resolve some hosts (e.g. smtp.gmail.com) to an IPv6 address
// first but have no outbound IPv6 route, causing an immediate ENETUNREACH — prefer
// IPv4 results so outgoing SMTP connections actually work.
dns.setDefaultResultOrder("ipv4first");
const mongoose = require("mongoose");
const app = require("./app");
const { startSafeWalkScheduler } = require("./utils/safeWalkScheduler");
const { startMedicineScheduler } = require("./utils/medicineScheduler");
const { startKeepAwake } = require("./utils/keepAwake");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection failed:", err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  startMedicineScheduler();
  startSafeWalkScheduler();
  startKeepAwake();
});
