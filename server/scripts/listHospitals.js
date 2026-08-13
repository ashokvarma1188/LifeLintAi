require("dotenv").config();
const mongoose = require("mongoose");
const Hospital = require("../models/Hospital");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const hospitals = await Hospital.find({}, "name address createdAt");
  hospitals.forEach((h) => {
    console.log(`${h._id} | ${h.name} | ${h.address} | ${h.createdAt.toISOString()}`);
  });
  console.log(`\nTotal: ${hospitals.length} hospitals`);
  await mongoose.disconnect();
};

run();
