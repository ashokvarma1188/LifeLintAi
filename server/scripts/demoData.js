/*
 * Presentation data: fills LifeLink with realistic sample activity around Vijayawada so
 * every page has something to show — a civilian with a full medical profile, past SOS
 * alerts (one with a chat), blood donors and requests, health records, medicine
 * reminders, an organ pledge, and blood-bank stock on the seeded hospitals.
 *
 * Everything it creates uses an @demo.lifelink.app email, so `reset` removes exactly
 * that and nothing else. Hospital blood stock is only filled where none was set.
 *
 *   cd server
 *   npm run demo:seed     # add / refresh the demo data
 *   npm run demo:reset    # remove all of it
 *
 * Demo logins (password Demo@12345): ravi@demo.lifelink.app (civilian),
 * plus three donors: sita@, kiran@ and arjun@demo.lifelink.app.
 */
require("dotenv").config();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Hospital = require("../models/Hospital");
const EmergencyRequest = require("../models/EmergencyRequest");
const SosMessage = require("../models/SosMessage");
const BloodRequest = require("../models/BloodRequest");
const HealthRecord = require("../models/HealthRecord");
const MedicineReminder = require("../models/MedicineReminder");
const SafeWalk = require("../models/SafeWalk");
const PushSubscription = require("../models/PushSubscription");

const DOMAIN = "@demo.lifelink.app";
const DEMO_PASSWORD = "Demo@12345";
const DAY = 24 * 60 * 60 * 1000;
const VIJAYAWADA = [80.648, 16.5062]; // [lng, lat]

const near = ([lng, lat], dLng, dLat) => ({ type: "Point", coordinates: [lng + dLng, lat + dLat] });
const daysAgo = (n, hour = 10) => {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(hour, 15, 0, 0);
  return d;
};
const isoDay = (date) => date.toISOString().slice(0, 10);

const PEOPLE = [
  {
    key: "ravi",
    name: "Ravi Kumar",
    phone: "9000011111",
    bloodGroup: "B+",
    age: 34,
    allergies: ["Penicillin"],
    medicalHistory: ["Type 2 diabetes", "Mild asthma"],
    emergencyContacts: [
      { name: "Lakshmi Kumar", phone: "9000022222", relation: "Wife" },
      { name: "Suresh Kumar", phone: "9000033333", relation: "Brother" },
    ],
    organPledge: { pledged: true, organs: ["Kidneys", "Eyes (corneas)", "Liver"], familyInformed: true, pledgedAt: daysAgo(40) },
    donationCount: 3,
    lastDonatedAt: daysAgo(120),
  },
  { key: "sita", name: "Sita Devi", phone: "9000044444", bloodGroup: "O-", age: 27, donorAvailable: true, donationCount: 5, lastDonatedAt: daysAgo(150) },
  { key: "kiran", name: "Kiran Reddy", phone: "9000055555", bloodGroup: "A+", age: 31, donorAvailable: true, donationCount: 1, lastDonatedAt: daysAgo(200) },
  { key: "arjun", name: "Arjun Naidu", phone: "9000066666", bloodGroup: "O+", age: 40, donorAvailable: true, donationCount: 11, lastDonatedAt: daysAgo(95) },
];

const DEFAULT_STOCK = { "A+": 14, "A-": 2, "B+": 11, "B-": 1, "O+": 18, "O-": 3, "AB+": 5, "AB-": 0 };

async function demoUserIds() {
  return User.find({ email: { $regex: `${DOMAIN.replace(/\./g, "\\.")}$` } }).distinct("_id");
}

async function reset({ quiet = false } = {}) {
  const ids = await demoUserIds();
  if (!ids.length) {
    if (!quiet) console.log("No demo data found — nothing to remove.");
    return;
  }
  const sosIds = await EmergencyRequest.find({ citizenId: { $in: ids } }).distinct("_id");
  const results = await Promise.all([
    SosMessage.deleteMany({ requestId: { $in: sosIds } }),
    EmergencyRequest.deleteMany({ _id: { $in: sosIds } }),
    BloodRequest.deleteMany({ requestedBy: { $in: ids } }),
    BloodRequest.updateMany({}, { $pull: { responses: { donorId: { $in: ids } } } }),
    HealthRecord.deleteMany({ userId: { $in: ids } }),
    MedicineReminder.deleteMany({ userId: { $in: ids } }),
    SafeWalk.deleteMany({ userId: { $in: ids } }),
    PushSubscription.deleteMany({ userId: { $in: ids } }),
  ]);
  await User.deleteMany({ _id: { $in: ids } });
  if (!quiet) {
    console.log(`Removed ${ids.length} demo users, ${results[1].deletedCount} SOS alerts, ${results[2].deletedCount} blood requests,`);
    console.log(`${results[4].deletedCount} health records and ${results[5].deletedCount} medicine reminders.`);
  }
}

async function seed() {
  await reset({ quiet: true }); // re-seeding always starts clean
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = {};
  for (const [i, p] of PEOPLE.entries()) {
    const { key, ...fields } = p;
    users[key] = await User.create({
      ...fields,
      email: `${key}${DOMAIN}`,
      password,
      role: "civilian",
      roleStatus: "approved",
      emailVerified: true,
      location: near(VIJAYAWADA, 0.01 * i, -0.008 * i),
    });
  }
  const ravi = users.ravi;

  // Blood-bank stock on the seeded hospitals that don't have any yet.
  const hospitals = await Hospital.find({}).limit(12);
  let stocked = 0;
  for (const h of hospitals) {
    const current = h.bloodStock ? [...h.bloodStock.values()] : [];
    if (current.some((units) => units > 0)) continue;
    const scale = 0.5 + (stocked % 3) * 0.4;
    const stock = Object.fromEntries(Object.entries(DEFAULT_STOCK).map(([g, n]) => [g, Math.round(n * scale)]));
    await Hospital.updateOne({ _id: h._id }, { bloodStock: stock, bloodStockUpdatedAt: new Date(), bloodBankAvailable: true });
    stocked += 1;
  }
  const nearestHospital = await Hospital.findOne({ location: { $near: { $geometry: { type: "Point", coordinates: VIJAYAWADA } } } });

  // Past SOS alerts — a resolved accident with a chat, a cancelled one, and a resolved fire.
  const alert = (props) =>
    EmergencyRequest.create({
      citizenId: ravi._id,
      location: near(VIJAYAWADA, 0.004, 0.006),
      assignedHospitalId: nearestHospital?._id,
      shareToken: crypto.randomBytes(12).toString("hex"),
      ...props,
    });
  const accident = await alert({ type: "accident", status: "resolved", targets: ["hospital", "police"], respondedByRole: "hospital", etaMinutes: 7, createdAt: daysAgo(12, 19), updatedAt: daysAgo(12, 20) });
  await alert({ type: "medical", status: "cancelled", cancelReason: "safe_now", targets: ["hospital"], createdAt: daysAgo(5, 8), updatedAt: daysAgo(5, 8) });
  await alert({ type: "fire", status: "resolved", targets: ["firestation", "police"], respondedByRole: "firestation", etaMinutes: 9, createdAt: daysAgo(2, 14), updatedAt: daysAgo(2, 15) });
  const chat = [
    ["civilian", "Ravi Kumar", "Bike skid near Benz Circle, my friend's leg is bleeding."],
    ["hospital", nearestHospital?.name || "City Hospital", "Ambulance is on the way. Press a clean cloth firmly on the wound and keep him lying down."],
    ["civilian", "Ravi Kumar", "Done. We are next to the bus stop opposite the petrol bunk."],
    ["hospital", nearestHospital?.name || "City Hospital", "Got it — about 5 minutes away."],
  ];
  for (const [i, [senderRole, senderName, text]] of chat.entries()) {
    await SosMessage.create({
      requestId: accident._id,
      senderId: ravi._id,
      senderRole,
      senderName,
      kind: "text",
      text,
      createdAt: new Date(accident.createdAt.getTime() + (i + 1) * 60000),
    });
  }

  // Health records with vitals, so Medical ID shows trend charts.
  const vitals = [
    [150, 138, 82, 76.5],
    [110, 132, 80, 76.0],
    [70, 128, 78, 75.2],
    [30, 126, 76, 74.8],
    [7, 122, 74, 74.1],
  ];
  for (const [ago, sugar, systolic, rate, weight] of vitals.map(([d, s, sys, w]) => [d, s, sys, 72 + (d % 5), w])) {
    await HealthRecord.create({
      userId: ravi._id,
      title: ago === 7 ? "Diabetes follow-up" : "Routine check-up",
      recordType: ago === 7 ? "consultation" : "lab",
      hospitalName: nearestHospital?.name || "Government General Hospital, Vijayawada",
      doctorName: "Dr. Rao",
      recordDate: isoDay(daysAgo(ago)),
      bloodPressure: `${systolic}/${systolic - 44}`,
      heartRate: rate,
      bloodSugar: sugar,
      weight,
      notes: ago === 7 ? "Sugar levels improving with diet and medication." : "All values within expected range.",
      recommendations: ago === 7 ? "Continue Metformin, walk 30 minutes daily." : "",
      followUpDate: ago === 7 ? isoDay(new Date(Date.now() + 5 * DAY)) : "",
    });
  }

  // Medicine reminders.
  await MedicineReminder.create([
    { userId: ravi._id, name: "Metformin", dose: "500 mg after food", times: ["08:00", "20:00"], notes: "Prescribed by Dr. Rao" },
    { userId: ravi._id, name: "Salbutamol inhaler", dose: "2 puffs if breathless", times: ["21:30"] },
  ]);

  // Open blood requests other donors can answer, one with a donor already accepting.
  await BloodRequest.create([
    {
      requestedBy: ravi._id,
      bloodGroup: "O-",
      unitsNeeded: 2,
      notes: "Needed for surgery at Government General Hospital, Vijayawada",
      location: near(VIJAYAWADA, 0.003, 0.002),
      responses: [{ donorId: users.sita._id, status: "accepted" }],
    },
    { requestedBy: users.kiran._id, bloodGroup: "B+", unitsNeeded: 1, notes: "For my father's dialysis this weekend", location: near(VIJAYAWADA, -0.01, 0.004) },
  ]);

  console.log("Demo data ready:");
  console.log(`  • ${PEOPLE.length} civilians — log in as ravi${DOMAIN} / ${DEMO_PASSWORD}`);
  console.log("  • 3 past SOS alerts (one with a chat), 5 health records, 2 medicine reminders");
  console.log("  • 2 open blood requests, 3 available donors, organ pledge on Ravi's Medical ID");
  console.log(`  • blood-bank stock added to ${stocked} hospital(s)`);
}

(async () => {
  const command = process.argv[2];
  if (!["seed", "reset"].includes(command)) {
    console.log("Usage: node scripts/demoData.js seed|reset");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  try {
    if (command === "seed") await seed();
    else await reset();
  } finally {
    await mongoose.disconnect();
  }
})().catch((err) => {
  console.error("Demo data failed:", err.message);
  process.exit(1);
});
