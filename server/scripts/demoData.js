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
 * Demo logins (password Demo@12345), also one tap each on the login page:
 *   ravi@     civilian with a full profile (plus donors sita@, kiran@, arjun@)
 *   hospital@ LifeLink Demo Hospital
 *   police@   Vijayawada Police (Demo)
 *   fire@     Vijayawada Fire Station (Demo)
 *   pharmacy@ LifeLink Demo Pharmacy
 * Demo accounts are sandboxed (utils/demo.js): they only see each other's alerts.
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
const MedicineRequest = require("../models/MedicineRequest");
const SafeWalk = require("../models/SafeWalk");
const PushSubscription = require("../models/PushSubscription");
const DonationCamp = require("../models/DonationCamp");
const Certificate = require("../models/Certificate");
const SafetyResponse = require("../models/SafetyResponse");

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
    MedicineRequest.deleteMany({ $or: [{ requestedBy: { $in: ids } }, { pharmacyId: { $in: ids } }] }),
    SafeWalk.deleteMany({ userId: { $in: ids } }),
    PushSubscription.deleteMany({ userId: { $in: ids } }),
    DonationCamp.deleteMany({ organiserId: { $in: ids } }),
    DonationCamp.updateMany({}, { $pull: { registrations: { userId: { $in: ids } } } }),
    Certificate.deleteMany({ userId: { $in: ids } }),
    SafetyResponse.deleteMany({ userId: { $in: ids } }),
    Hospital.deleteMany({ ownerId: { $in: ids } }),
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
      demo: true,
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

  // Demo responders: a hospital (with its own listing), police and fire station, all approved.
  const org = (key, role, orgName, extra = {}) =>
    User.create({
      name: orgName, orgName, email: `${key}${DOMAIN}`, password, role, roleStatus: "approved", emailVerified: true,
      phone: "0866000" + String(Math.floor(1000 + Math.random() * 8999)), serviceRadiusKm: 25, ...extra,
    });
  const demoHospitalUser = await org("hospital", "hospital", "LifeLink Demo Hospital");
  const demoHospital = await Hospital.create({
    name: "LifeLink Demo Hospital", ownerId: demoHospitalUser._id, phone: demoHospitalUser.phone, address: "MG Road, Vijayawada",
    location: near(VIJAYAWADA, 0.006, -0.004), totalBeds: 60, availableBeds: 18, icuBeds: 10, icuAvailableBeds: 4,
    ambulanceAvailable: true, ambulanceCount: 3, oxygenAvailable: true, bloodBankAvailable: true,
    bloodStock: DEFAULT_STOCK, bloodStockUpdatedAt: new Date(),
  });
  const demoPolice = await org("police", "police", "Vijayawada Police (Demo)", { location: near(VIJAYAWADA, -0.008, 0.005) });
  await org("fire", "firestation", "Vijayawada Fire Station (Demo)", {
    location: near(VIJAYAWADA, 0.01, 0.008),
    fleet: [{ unitName: "Engine 1", status: "available" }, { unitName: "Engine 2", status: "available" }, { unitName: "Rescue van", status: "maintenance" }],
  });

  const demoPharmacy = await org("pharmacy", "pharmacy", "LifeLink Demo Pharmacy", {
    location: near(VIJAYAWADA, 0.004, 0.003), openHours: "8 AM – 11 PM", isOpen: true,
    stock: [
      { medicineName: "Paracetamol 500 mg", inStock: true, quantity: 240 },
      { medicineName: "Amoxicillin 500 mg", inStock: true, quantity: 60 },
      { medicineName: "Salbutamol inhaler", inStock: true, quantity: 12 },
      { medicineName: "ORS sachets", inStock: true, quantity: 150 },
      { medicineName: "Insulin glargine", inStock: false, quantity: 0 },
    ],
  });
  await MedicineRequest.create({ requestedBy: ravi._id, pharmacyId: demoPharmacy._id, medicineName: "Insulin glargine", notes: "Need 1 pen for tonight, please." });

  // Live alerts for the demo responders to handle (they show for 24 h in the control room).
  const minutesAgo = (m) => new Date(Date.now() - m * 60000);
  const live = (who, props) => EmergencyRequest.create({
    citizenId: who._id, shareToken: crypto.randomBytes(12).toString("hex"), demo: true, assignedHospitalId: demoHospital._id, ...props,
  });
  await live(users.sita, { type: "medical", status: "pending", targets: ["hospital", "police"], location: near(VIJAYAWADA, 0.012, 0.006), shareMedicalId: true, createdAt: minutesAgo(6), updatedAt: minutesAgo(6) });
  await live(users.arjun, { type: "fire", status: "pending", targets: ["firestation", "police"], location: near(VIJAYAWADA, -0.014, -0.009), createdAt: minutesAgo(3), updatedAt: minutesAgo(3) });
  await live(users.kiran, {
    type: "accident", status: "en_route", targets: ["hospital", "police"], location: near(VIJAYAWADA, -0.004, 0.011),
    respondedBy: demoPolice._id, respondedByRole: "police", etaMinutes: 6,
    responderLocation: { coordinates: near(VIJAYAWADA, -0.02, 0.018).coordinates, updatedAt: new Date() },
    createdAt: minutesAgo(15), updatedAt: minutesAgo(4),
  });

  // An upcoming blood donation camp at the demo hospital, with two donors registered.
  const campDay = new Date(Date.now() + 6 * DAY);
  campDay.setHours(9, 0, 0, 0);
  await DonationCamp.create({
    organiserId: demoHospitalUser._id, organiserName: "LifeLink Demo Hospital", title: "World Blood Donor Week camp",
    description: "Free health check-up and refreshments for every donor.", venue: "Main hall, LifeLink Demo Hospital",
    location: demoHospital.location, startsAt: campDay, endsAt: new Date(campDay.getTime() + 6 * 60 * 60 * 1000), capacity: 80,
    registrations: [{ userId: users.sita._id }, { userId: users.kiran._id }],
  });

  console.log("Demo data ready:");
  console.log(`  • ${PEOPLE.length} civilians — log in as ravi${DOMAIN} / ${DEMO_PASSWORD}`);
  console.log("  • 3 past SOS alerts (one with a chat), 5 health records, 2 medicine reminders");
  console.log("  • 2 open blood requests, 3 available donors, organ pledge on Ravi's Medical ID");
  console.log(`  • blood-bank stock added to ${stocked} hospital(s)`);
  console.log(`  • demo hospital, police and fire station and pharmacy (hospital${DOMAIN}, police${DOMAIN}, fire${DOMAIN}, pharmacy${DOMAIN})`);
  console.log("  • 3 live alerts for them, and an upcoming donation camp");
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
