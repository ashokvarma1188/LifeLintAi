/*
 * Creates (or fixes up) the one demo account that can switch roles instantly,
 * with no admin approval — for showing every dashboard in a single login
 * during an interview/demo. See authController.demoSwitchRole.
 *
 *   cd server
 *   node scripts/createDemoAccount.js
 */

require("dotenv").config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/User");

const EMAIL = "lifelinkai";
const PASSWORD = "123456";

(async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing from server/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}`);

  const hashed = await bcrypt.hash(PASSWORD, 10);
  const existing = await User.findOne({ email: EMAIL });

  if (existing) {
    existing.password = hashed;
    existing.role = "civilian";
    existing.roleStatus = "approved";
    existing.isDemo = true;
    existing.suspended = false;
    existing.emailVerified = true;
    await existing.save();
    console.log(`\n✓ Updated existing account. Login with "${EMAIL}" / "${PASSWORD}".`);
  } else {
    await User.create({
      name: "LifeLink Demo",
      email: EMAIL,
      password: hashed,
      role: "civilian",
      roleStatus: "approved",
      isDemo: true,
      emailVerified: true,
    });
    console.log(`\n✓ Demo account created. Login with "${EMAIL}" / "${PASSWORD}".`);
  }

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error("Failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
