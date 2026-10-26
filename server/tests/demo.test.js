/* Demo accounts are sandboxed: demo and real users never see or act on each other's alerts. */
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, clear, api, makeUser } = require("./helpers");

before(start);
after(stop);
beforeEach(clear);

const HERE = { latitude: 16.5062, longitude: 80.648 };
const raise = (who) => api().post("/api/sos").set(who.auth).send({ ...HERE, type: "medical", targets: ["hospital", "police"] });

test("a demo SOS is tagged, and only demo responders see it", async () => {
  const demoCiv = await makeUser("civilian", { email: "civ@demo.lifelink.app" });
  const realCiv = await makeUser("civilian");
  const demoPolice = await makeUser("police", { email: "police@demo.lifelink.app" });
  const realPolice = await makeUser("police");
  const demoHospital = await makeUser("hospital", { email: "hospital@demo.lifelink.app" });
  const realHospital = await makeUser("hospital");

  const demoAlert = (await raise(demoCiv)).body.emergencyRequest;
  const realAlert = (await raise(realCiv)).body.emergencyRequest;
  assert.equal(demoAlert.demo, true);
  assert.equal(realAlert.demo, false);

  const ids = (res) => res.body.requests.map((r) => String(r._id));
  assert.deepEqual(ids(await api().get("/api/police/alerts").set(demoPolice.auth)), [String(demoAlert._id)]);
  assert.deepEqual(ids(await api().get("/api/police/alerts").set(realPolice.auth)), [String(realAlert._id)]);
  assert.deepEqual(ids(await api().get("/api/sos").set(demoHospital.auth)), [String(demoAlert._id)]);
  assert.deepEqual(ids(await api().get("/api/sos").set(realHospital.auth)), [String(realAlert._id)]);
});

test("demo responders can't accept or read real alerts, and the other way round", async () => {
  const demoPolice = await makeUser("police", { email: "police@demo.lifelink.app" });
  const realPolice = await makeUser("police");
  const realAlert = (await raise(await makeUser("civilian"))).body.emergencyRequest;
  const demoAlert = (await raise(await makeUser("civilian", { email: "civ@demo.lifelink.app" }))).body.emergencyRequest;

  assert.equal((await api().patch(`/api/sos/${realAlert._id}/accept`).set(demoPolice.auth)).status, 404);
  assert.equal((await api().get(`/api/sos/${realAlert._id}/messages`).set(demoPolice.auth)).status, 404);
  assert.equal((await api().patch(`/api/sos/${demoAlert._id}/accept`).set(realPolice.auth)).status, 404);
  assert.equal((await api().patch(`/api/sos/${demoAlert._id}/accept`).set(demoPolice.auth)).status, 200);
});

test("the presenter's walkthrough Gmail is sandboxed like a demo account", async () => {
  const presenter = await makeUser("civilian", { email: "ashokvarma5247+demo@gmail.com" });
  const realGmail = await makeUser("civilian", { email: "ashokvarma5247@gmail.com" });
  assert.equal((await raise(presenter)).body.emergencyRequest.demo, true);
  assert.equal((await raise(realGmail)).body.emergencyRequest.demo, false);
});

test("real civilians never find the demo pharmacy, and demo civilians only find it", async () => {
  await makeUser("pharmacy", { email: "pharmacy@demo.lifelink.app", orgName: "Demo Pharmacy" });
  await makeUser("pharmacy", { orgName: "Real Pharmacy" });
  const names = async (who) => (await api().get("/api/pharmacies").set(who.auth)).body.pharmacies.map((p) => p.orgName);
  assert.deepEqual(await names(await makeUser("civilian")), ["Real Pharmacy"]);
  assert.deepEqual(await names(await makeUser("civilian", { email: "civ@demo.lifelink.app" })), ["Demo Pharmacy"]);
});

test("demo responders can chat on demo alerts", async () => {
  const demoHospital = await makeUser("hospital", { email: "hospital@demo.lifelink.app" });
  const demoCiv = await makeUser("civilian", { email: "civ@demo.lifelink.app" });
  const demoAlert = (await raise(demoCiv)).body.emergencyRequest;

  const sent = await api().post(`/api/sos/${demoAlert._id}/messages`).set(demoHospital.auth).send({ text: "Ambulance on the way" });
  assert.equal(sent.status, 201);
  const seen = await api().get(`/api/sos/${demoAlert._id}/messages`).set(demoCiv.auth);
  assert.deepEqual(seen.body.messages.map((m) => m.text), ["Ambulance on the way"]);
});

test("the control room shows demo responders only demo alerts; admins see everything", async () => {
  const demoPolice = await makeUser("police", { email: "police@demo.lifelink.app" });
  const realPolice = await makeUser("police");
  const admin = await makeUser("admin");
  await raise(await makeUser("civilian"));
  await raise(await makeUser("civilian", { email: "civ@demo.lifelink.app" }));

  assert.equal((await api().get("/api/control-room").set(demoPolice.auth)).body.alerts.length, 1);
  assert.equal((await api().get("/api/control-room").set(realPolice.auth)).body.alerts.length, 1);
  assert.equal((await api().get("/api/control-room").set(admin.auth)).body.alerts.length, 2);
});

test("the public impact numbers count real data only, never demo data", async () => {
  const Hospital = require("../models/Hospital");
  const EmergencyRequest = require("../models/EmergencyRequest");
  const realCiv = await makeUser("civilian");
  const demoCiv = await makeUser("civilian", { email: "civ@demo.lifelink.app" });
  const demoOwner = await makeUser("hospital", { email: "hospital@demo.lifelink.app" });
  await Hospital.create({ name: "Real", location: { type: "Point", coordinates: [80.6, 16.5] }, bloodStock: { "O+": 5, "A+": 3 } });
  await Hospital.create({ name: "Demo", ownerId: demoOwner.user._id, location: { type: "Point", coordinates: [80.6, 16.5] }, bloodStock: { "O+": 50 } });
  const at = { type: "Point", coordinates: [80.6, 16.5] };
  await EmergencyRequest.create({ citizenId: realCiv.user._id, location: at, status: "resolved" });
  await EmergencyRequest.create({ citizenId: demoCiv.user._id, location: at, status: "resolved", demo: true });

  const { impact } = (await api().get("/api/public/network-stats")).body;
  assert.equal(impact.hospitals, 1);
  assert.equal(impact.bloodUnits, 8);
  assert.equal(impact.sosResolved, 1);
});
