/* Donor rest periods, medicine reminders, the QR Medical ID and the organ pledge. */
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, clear, api, makeUser } = require("./helpers");
const MedicineReminder = require("../models/MedicineReminder");
const { sendDueReminders } = require("../utils/medicineScheduler");

before(start);
after(stop);
beforeEach(clear);

test("donating starts a 90-day rest and hides the donor from the directory", async () => {
  const donor = await makeUser("civilian", { bloodGroup: "O-", donorAvailable: true });
  const seeker = await makeUser("civilian");
  assert.equal((await api().get("/api/donors").set(seeker.auth)).body.donors.length, 1);

  const res = await api().post("/api/donors/me/donated").set(donor.auth);
  assert.equal(res.status, 200);
  assert.equal(res.body.donationCount, 1);
  assert.equal(res.body.livesSaved, 3);
  assert.equal(res.body.eligible, false);
  assert.ok(res.body.daysUntilEligible >= 89);

  assert.equal((await api().get("/api/donors").set(seeker.auth)).body.donors.length, 0, "resting donor is hidden");
  assert.equal((await api().put("/api/donors/me").set(donor.auth).send({ donorAvailable: true })).status, 400, "cannot re-list while resting");
  assert.equal((await api().post("/api/donors/me/donated").set(donor.auth)).status, 400, "cannot donate twice in the rest period");
});

test("medicine reminders: validation, sorting, taking a dose, and ownership", async () => {
  const me = await makeUser("civilian");
  const other = await makeUser("civilian");
  assert.equal((await api().post("/api/medicines").set(me.auth).send({ times: ["08:00"] })).status, 400, "name is required");
  assert.equal((await api().post("/api/medicines").set(me.auth).send({ name: "X", times: ["25:61"] })).status, 400, "time must be real");

  const created = await api().post("/api/medicines").set(me.auth).send({ name: "Metformin", dose: "500 mg", times: ["20:00", "08:00", "08:00"] });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.medicine.times, ["08:00", "20:00"]);
  const id = created.body.medicine._id;

  const taken = await api().post(`/api/medicines/${id}/taken`).set(me.auth).send({ time: "08:00" });
  assert.equal(taken.body.medicine.taken.length, 1);
  assert.equal((await api().post(`/api/medicines/${id}/taken`).set(other.auth).send({ time: "08:00" })).status, 404);
  assert.equal((await api().put(`/api/medicines/${id}`).set(me.auth).send({ active: false })).body.medicine.active, false);
});

test("the reminder scheduler claims each dose once and skips paused medicines", async () => {
  const me = await makeUser("civilian");
  const med = await MedicineReminder.create({ userId: me.user._id, name: "Vitamin D", times: ["09:00"] });
  const paused = await MedicineReminder.create({ userId: me.user._id, name: "Paused", times: ["09:00"], active: false });

  await sendDueReminders({ date: "2030-01-01", time: "09:00" });
  assert.equal((await MedicineReminder.findById(med._id)).lastNotified, "2030-01-01 09:00");
  assert.equal((await MedicineReminder.findById(paused._id)).lastNotified, undefined, "paused medicine is ignored");

  // A second tick in the same minute must not resend.
  await MedicineReminder.updateOne({ _id: med._id }, { $set: { name: "Vitamin D" } });
  await sendDueReminders({ date: "2030-01-01", time: "09:00" });
  assert.equal((await MedicineReminder.findById(med._id)).lastNotified, "2030-01-01 09:00");
});

test("QR Medical ID shows emergency facts only, and stops working when turned off or rotated", async () => {
  const me = await makeUser("civilian", { bloodGroup: "B+", phone: "9000000001", allergies: ["Penicillin"] });
  await api().put("/api/profile/organ-pledge").set(me.auth).send({ pledged: true, organs: ["Kidneys", "Not an organ"], familyInformed: true });

  const first = (await api().post("/api/profile/medical-id-link").set(me.auth)).body.medicalIdToken;
  const card = await api().get(`/api/public/medical-id/${first}`);
  assert.equal(card.status, 200);
  assert.equal(card.body.bloodGroup, "B+");
  assert.deepEqual(card.body.organDonor, ["Kidneys"], "only real organs are stored");
  assert.ok(!JSON.stringify(card.body).includes("9000000001"), "owner's own phone is not exposed");
  assert.ok(!JSON.stringify(card.body).includes("example.test"), "email is not exposed");

  const second = (await api().post("/api/profile/medical-id-link").set(me.auth)).body.medicalIdToken;
  assert.equal((await api().get(`/api/public/medical-id/${first}`)).status, 404, "old printed code stops working");
  await api().delete("/api/profile/medical-id-link").set(me.auth);
  assert.equal((await api().get(`/api/public/medical-id/${second}`)).status, 404, "turned off");
});

test("hospital blood stock is cleaned and searchable by group", async () => {
  const Hospital = require("../models/Hospital");
  const owner = await makeUser("hospital");
  const h = await Hospital.create({ name: "City", location: { type: "Point", coordinates: [80.6, 16.5] } });
  const res = await api().patch(`/api/hospitals/${h._id}`).set(owner.auth).send({ bloodStock: { "O-": 4, "A+": -3, "XYZ": 9, "B+": 2.6 } });
  assert.equal(res.status, 200);
  assert.equal(res.body.hospital.bloodStock["O-"], 4);
  assert.equal(res.body.hospital.bloodStock["A+"], 0, "negative counts become 0");
  assert.equal(res.body.hospital.bloodStock["B+"], 3, "rounded to whole units");
  assert.equal(res.body.hospital.bloodStock.XYZ, undefined, "unknown groups dropped");
  assert.equal(res.body.hospital.bloodBankAvailable, true);
});
