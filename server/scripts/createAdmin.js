/*
 * Creates the first admin account.
 *
 * Deliberately a CLI script and not an API route — there is no way to create an
 * admin from the website, so the role cannot be self-assigned by a visitor.
 *
 *   cd server
 *   node scripts/createAdmin.js
 */

require("dotenv").config();
const readline = require("readline");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/User");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));

(async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing from server/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}\n`);

  const name = await ask("Admin name: ");
  const email = (await ask("Admin email: ")).toLowerCase();
  const password = await ask("Admin password (min 6 chars): ");

  if (!name || !email || password.length < 6) {
    console.error("\nName, email and a 6+ character password are all required.");
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }

  const existing = await User.findOne({ email });

  if (existing) {
    const confirm = await ask(
      `\n"${email}" already exists as role "${existing.role}". Promote it to admin? (y/N) `
    );
    if (confirm.toLowerCase() !== "y") {
      console.log("Cancelled.");
      rl.close();
      await mongoose.disconnect();
      return;
    }

    existing.role = "admin";
    existing.roleStatus = "approved";
    existing.password = await bcrypt.hash(password, 10);
    await existing.save();
    console.log(`\n✓ ${email} is now an admin.`);
  } else {
    await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: "admin",
      roleStatus: "approved",
    });
    console.log(`\n✓ Admin account created for ${email}.`);
  }

  rl.close();
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error("Failed:", err.message);
  rl.close();
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
