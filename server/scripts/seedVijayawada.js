/*
 * Seeds real Vijayawada/Mangalagiri-area hospitals, a police station, a fire
 * station and a pharmacy, so testing from VIT-AP (or anywhere in that region)
 * shows realistic nearby results instead of falling back to Hyderabad (the
 * only other city with seed data). Safe to re-run — skips anything that
 * already exists by name/email.
 *
 *   cd server
 *   node scripts/seedVijayawada.js
 */

require("dotenv").config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Hospital = require("../models/Hospital");
const User = require("../models/User");
const geocodeAddress = require("../utils/geocode");

const DEMO_PASSWORD = "Demo@12345";

const HOSPITALS = [
  {
    name: "Government General Hospital, Vijayawada",
    address: "Government General Hospital, Vijayawada, Andhra Pradesh, India",
    totalBeds: 1000,
    availableBeds: 80,
    icuBeds: 100,
    icuAvailableBeds: 10,
    ambulanceAvailable: true,
    ambulanceCount: 8,
    bloodBankAvailable: true,
    oxygenAvailable: true,
  },
  {
    name: "Andhra Hospitals, Vijayawada",
    address: "Andhra Hospitals, Vijayawada, Andhra Pradesh, India",
    totalBeds: 300,
    availableBeds: 25,
    icuBeds: 40,
    icuAvailableBeds: 5,
    ambulanceAvailable: true,
    ambulanceCount: 4,
    bloodBankAvailable: true,
    oxygenAvailable: true,
  },
  {
    name: "Manipal Hospital, Vijayawada",
    address: "Manipal Hospital, Vijayawada, Andhra Pradesh, India",
    totalBeds: 350,
    availableBeds: 28,
    icuBeds: 45,
    icuAvailableBeds: 6,
    ambulanceAvailable: true,
    ambulanceCount: 5,
    bloodBankAvailable: true,
    oxygenAvailable: true,
  },
  {
    name: "NRI General Hospital, Mangalagiri",
    address: "NRI General Hospital, Chinakakani, Mangalagiri, Andhra Pradesh, India",
    totalBeds: 600,
    availableBeds: 50,
    icuBeds: 70,
    icuAvailableBeds: 9,
    ambulanceAvailable: true,
    ambulanceCount: 6,
    bloodBankAvailable: true,
    oxygenAvailable: true,
  },
];

const ORG_ACCOUNTS = [
  {
    role: "police",
    name: "Mangalagiri Police Station",
    orgName: "Mangalagiri Police Station",
    email: "demo-police-vja@lifelink.local",
    address: "Mangalagiri Police Station, Mangalagiri, Andhra Pradesh, India",
  },
  {
    role: "firestation",
    name: "Vijayawada Fire Station",
    orgName: "Vijayawada Fire Station",
    email: "demo-fire-vja@lifelink.local",
    address: "Vijayawada Fire Station, Vijayawada, Andhra Pradesh, India",
  },
  {
    role: "pharmacy",
    name: "Apollo Pharmacy, Mangalagiri",
    orgName: "Apollo Pharmacy, Mangalagiri",
    email: "demo-pharmacy-vja@lifelink.local",
    address: "Apollo Pharmacy, Mangalagiri, Andhra Pradesh, India",
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing from server/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}\n`);

  for (const h of HOSPITALS) {
    const existing = await Hospital.findOne({ name: h.name });
    if (existing) {
      console.log(`skip (already exists): ${h.name}`);
      continue;
    }
    try {
      const { latitude, longitude } = await geocodeAddress(h.address);
      await Hospital.create({
        name: h.name,
        address: h.address,
        location: { type: "Point", coordinates: [longitude, latitude] },
        totalBeds: h.totalBeds,
        availableBeds: h.availableBeds,
        icuBeds: h.icuBeds,
        icuAvailableBeds: h.icuAvailableBeds,
        ambulanceAvailable: h.ambulanceAvailable,
        ambulanceCount: h.ambulanceCount,
        bloodBankAvailable: h.bloodBankAvailable,
        oxygenAvailable: h.oxygenAvailable,
      });
      console.log(`✓ created hospital: ${h.name} at [${longitude}, ${latitude}]`);
    } catch (err) {
      console.error(`✗ failed: ${h.name} — ${err.message}`);
    }
    await sleep(1100); // Nominatim's usage policy: at most 1 request/second.
  }

  for (const org of ORG_ACCOUNTS) {
    const existing = await User.findOne({ email: org.email });
    if (existing) {
      console.log(`skip (already exists): ${org.name}`);
      continue;
    }
    try {
      const { latitude, longitude } = await geocodeAddress(org.address);
      await User.create({
        name: org.name,
        email: org.email,
        password: await bcrypt.hash(DEMO_PASSWORD, 10),
        role: org.role,
        roleStatus: "approved",
        orgName: org.orgName,
        emailVerified: true,
        twoFactorEnabled: true,
        location: { type: "Point", coordinates: [longitude, latitude] },
      });
      console.log(`✓ created ${org.role}: ${org.name} at [${longitude}, ${latitude}]`);
    } catch (err) {
      console.error(`✗ failed: ${org.name} — ${err.message}`);
    }
    await sleep(1100);
  }

  await mongoose.disconnect();
  console.log(`\nDone. Demo org accounts (if you ever need to log into one) share the password: ${DEMO_PASSWORD}`);
})().catch(async (err) => {
  console.error("Failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
