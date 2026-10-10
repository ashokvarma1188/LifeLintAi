/* Disaster Safety Check and the live control room. */
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, clear, api, makeUser } = require("./helpers");
const EmergencyRequest = require("../models/EmergencyRequest");
const Hospital = require("../models/Hospital");

before(start);
after(stop);
beforeEach(clear);

const VIJAYAWADA = { latitude: 16.5062, longitude: 80.648 };

const declare = async (admin, extra = {}) =>
  api().post("/api/safety-checks").set(admin.auth).send({ title: "Cyclone in Vijayawada", kind: "cyclone", radiusKm: 15, ...VIJAYAWADA, ...extra });

test("only admins can declare a Safety Check, and it needs a real area", async () => {
  const admin = await makeUser("admin");
  const civilian = await makeUser("civilian");
  assert.equal((await declare(civilian)).status, 403);
  assert.equal((await declare(admin, { radiusKm: 0 })).status, 400);
  assert.equal((await declare(admin, { latitude: "" })).status, 400);
  const res = await declare(admin);
  assert.equal(res.status, 201);
  assert.equal(res.body.check.area.radiusKm, 15);
});

test("civilians answer; 'need help' raises one SOS to police and fire with their location", async () => {
  const admin = await makeUser("admin");
  const priya = await makeUser("civilian", { phone: "9000000002" });
  const ravi = await makeUser("civilian");
  const check = (await declare(admin)).body.check;

  const active = await api().get("/api/safety-checks/active").set(priya.auth);
  assert.equal(active.body.checks.length, 1);
  assert.equal(active.body.checks[0].myResponse, null);

  assert.equal((await api().post(`/api/safety-checks/${check._id}/respond`).set(priya.auth).send({ status: "need_help" })).status, 400, "location required");
  const help = await api().post(`/api/safety-checks/${check._id}/respond`).set(priya.auth).send({ status: "need_help", latitude: 16.52, longitude: 80.63 });
  assert.equal(help.status, 200);
  const sos = await EmergencyRequest.findById(help.body.response.sosRequestId);
  assert.deepEqual([...sos.targets].sort(), ["firestation", "police"]);

  // Answering again doesn't raise a second SOS.
  await api().post(`/api/safety-checks/${check._id}/respond`).set(priya.auth).send({ status: "need_help", latitude: 16.52, longitude: 80.63 });
  assert.equal(await EmergencyRequest.countDocuments({ citizenId: priya.user._id }), 1);

  await api().post(`/api/safety-checks/${check._id}/respond`).set(ravi.auth).send({ status: "safe" });
  assert.equal((await api().get("/api/safety-checks/active").set(ravi.auth)).body.checks[0].myResponse, "safe");

  const detail = await api().get(`/api/safety-checks/${check._id}`).set(admin.auth);
  assert.deepEqual(detail.body.check.counts, { safe: 1, need_help: 1, not_in_area: 0 });
  const helpRow = detail.body.responses.find((r) => r.status === "need_help");
  assert.equal(helpRow.phone, "9000000002", "admin can reach people who need help");
  assert.ok(helpRow.distanceKm > 0 && helpRow.distanceKm < 15);
  assert.equal(detail.body.responses.find((r) => r.status === "safe").phone, null, "no phone for people who are safe");
  assert.equal((await api().get(`/api/safety-checks/${check._id}`).set(ravi.auth)).status, 403);
});

test("a closed Safety Check stops showing and can't be answered", async () => {
  const admin = await makeUser("admin");
  const me = await makeUser("civilian");
  const check = (await declare(admin)).body.check;
  assert.equal((await api().post(`/api/safety-checks/${check._id}/close`).set(admin.auth)).status, 200);
  assert.equal((await api().get("/api/safety-checks/active").set(me.auth)).body.checks.length, 0);
  assert.equal((await api().post(`/api/safety-checks/${check._id}/respond`).set(me.auth).send({ status: "safe" })).status, 404);
});

test("control room: responders and admins only, and no names or phone numbers", async () => {
  const civilian = await makeUser("civilian", { name: "Secret Person", phone: "9111111111" });
  const police = await makeUser("police");
  const pendingFire = await makeUser("firestation", { roleStatus: "pending" });
  const admin = await makeUser("admin");
  await Hospital.create({ name: "City Hospital", location: { type: "Point", coordinates: [80.64, 16.5] }, availableBeds: 7, icuAvailableBeds: 2 });
  await EmergencyRequest.create({ citizenId: civilian.user._id, type: "medical", location: { type: "Point", coordinates: [80.65, 16.51] }, targets: ["hospital"] });
  await EmergencyRequest.create({ citizenId: civilian.user._id, type: "fire", status: "resolved", location: { type: "Point", coordinates: [80.65, 16.51] }, targets: ["firestation"] });
  await declare(admin);

  assert.equal((await api().get("/api/control-room").set(civilian.auth)).status, 403);
  assert.equal((await api().get("/api/control-room").set(pendingFire.auth)).status, 403);

  const res = await api().get("/api/control-room").set(police.auth);
  assert.equal(res.status, 200);
  assert.equal(res.body.alerts.length, 1, "only open alerts");
  assert.equal(res.body.stats.resolvedToday, 1);
  assert.equal(res.body.stats.freeBeds, 7);
  assert.equal(res.body.safetyChecks.length, 1);
  const text = JSON.stringify(res.body);
  assert.ok(!text.includes("Secret Person") && !text.includes("9111111111"), "no personal details");
  assert.equal((await api().get("/api/control-room").set(admin.auth)).status, 200);
});
