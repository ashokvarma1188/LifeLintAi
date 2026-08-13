require("dotenv").config();
const mongoose = require("mongoose");
const Hospital = require("../models/Hospital");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const testDeleteResult = await Hospital.deleteMany({ name: "Test Hospital Near Me" });
  console.log(`Deleted ${testDeleteResult.deletedCount} "Test Hospital Near Me" entries`);

  const cityCareDupes = await Hospital.find({ name: "City Care Hospital" }).sort({ createdAt: 1 });
  if (cityCareDupes.length > 1) {
    const idsToDelete = cityCareDupes.slice(1).map((h) => h._id);
    const dupeDeleteResult = await Hospital.deleteMany({ _id: { $in: idsToDelete } });
    console.log(`Deleted ${dupeDeleteResult.deletedCount} duplicate "City Care Hospital" entries`);
  }

  const remaining = await Hospital.find({}, "name address");
  console.log("\nRemaining hospitals:");
  remaining.forEach((h) => console.log(`- ${h.name} | ${h.address}`));

  await mongoose.disconnect();
};

run();
