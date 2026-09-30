/*
 * Seeds a handful of real Hyderabad hospitals so SOS's 10km match and Find
 * Hospitals actually have something to show during a demo. Safe to re-run —
 * skips any hospital that already exists by name.
 *
 *   cd server
 *   node scripts/seedHospitals.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Hospital = require("../models/Hospital");
const geocodeAddress = require("../utils/geocode");

const HOSPITALS = [
  {
    name: "Apollo Hospitals, Jubilee Hills",
    address: "Apollo Hospitals, Road No. 72, Jubilee Hills, Hyderabad, Telangana, India",
    totalBeds: 500,
    availableBeds: 42,
    ambulanceAvailable: true,
    bloodBankAvailable: true,
    oxygenAvailable: true,
  },
  {
    name: "Yashoda Hospitals, Somajiguda",
    address: "Yashoda Hospitals, Raj Bhavan Road, Somajiguda, Hyderabad, Telangana, India",
    totalBeds: 450,
    availableBeds: 30,
    ambulanceAvailable: true,
    bloodBankAvailable: true,
    oxygenAvailable: true,
  },
  {
    name: "KIMS Hospital, Secunderabad",
    address: "KIMS Hospital, Minister Road, Secunderabad, Telangana, India",
    totalBeds: 1000,
    availableBeds: 75,
    ambulanceAvailable: true,
    bloodBankAvailable: true,
    oxygenAvailable: true,
  },
  {
    name: "Continental Hospitals, Gachibowli",
    address: "Continental Hospitals, IT Park Road, Nanakramguda, Gachibowli, Hyderabad, Telangana, India",
    totalBeds: 700,
    availableBeds: 58,
    ambulanceAvailable: true,
    bloodBankAvailable: true,
    oxygenAvailable: true,
  },
  {
    name: "Osmania General Hospital, Afzal Gunj",
    address: "Osmania General Hospital, Afzal Gunj, Hyderabad, Telangana, India",
    totalBeds: 1100,
    availableBeds: 90,
    ambulanceAvailable: true,
    bloodBankAvailable: true,
    oxygenAvailable: false,
  },
  {
    name: "NIMS Hospital, Punjagutta",
    address: "Nizam's Institute of Medical Sciences, Punjagutta, Hyderabad, Telangana, India",
    totalBeds: 1200,
    availableBeds: 65,
    ambulanceAvailable: true,
    bloodBankAvailable: true,
    oxygenAvailable: true,
  },
  {
    name: "Care Hospitals, Banjara Hills",
    address: "Care Hospitals, Road No. 1, Banjara Hills, Hyderabad, Telangana, India",
    totalBeds: 350,
    availableBeds: 20,
    ambulanceAvailable: true,
    bloodBankAvailable: false,
    oxygenAvailable: true,
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
        ambulanceAvailable: h.ambulanceAvailable,
        bloodBankAvailable: h.bloodBankAvailable,
        oxygenAvailable: h.oxygenAvailable,
      });
      console.log(`✓ created: ${h.name} at [${longitude}, ${latitude}]`);
    } catch (err) {
      console.error(`✗ failed: ${h.name} — ${err.message}`);
    }

    // Nominatim's usage policy asks for at most 1 request/second.
    await sleep(1100);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
})().catch(async (err) => {
  console.error("Failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
