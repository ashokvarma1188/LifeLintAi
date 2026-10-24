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
