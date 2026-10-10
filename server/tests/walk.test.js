const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, clear, api, makeUser } = require("./helpers");
const SafeWalk = require("../models/SafeWalk");
const EmergencyRequest = require("../models/EmergencyRequest");
const { checkWalks, GRACE_MS } = require("../utils/safeWalkScheduler");

before(start);
after(stop);
beforeEach(clear);

const START = { latitude: 16.5062, longitude: 80.648 };

test("starting a walk needs a sensible time and the user's location", async () => {
  const me = await makeUser("civilian");
  assert.equal((await api().post("/api/walks").set(me.auth).send({ minutes: 2, ...START })).status, 400);
  assert.equal((await api().post("/api/walks").set(me.auth).send({ minutes: 20 })).status, 400);
  const res = await api().post("/api/walks").set(me.auth).send({ minutes: 20, destination: "Home", ...START });
  assert.equal(res.status, 201);
  assert.equal(res.body.walk.status, "active");
});

test("family can follow the walk; it ends when the walker arrives", async () => {
  const me = await makeUser("civilian", { name: "Priya Sharma" });
  const walk = (await api().post("/api/walks").set(me.auth).send({ minutes: 20, destination: "Hostel", ...START })).body.walk;
  await api().patch(`/api/walks/${walk._id}/location`).set(me.auth).send({ latitude: 16.51, longitude: 80.65 });

  const page = await api().get(`/api/public/walk/${walk.shareToken}`);
  assert.equal(page.body.firstName, "Priya");
  assert.equal(page.body.destination, "Hostel");
  assert.deepEqual(page.body.location, [80.65, 16.51]);

  assert.equal((await api().post(`/api/walks/${walk._id}/arrived`).set(me.auth)).body.walk.status, "arrived");
  assert.equal((await api().get(`/api/public/walk/${walk.shareToken}`)).body.location, null, "location hidden after the walk");
});

test("a missed check-in becomes overdue, then alerts the police with the last location", async () => {
  const me = await makeUser("civilian");
  const walk = (await api().post("/api/walks").set(me.auth).send({ minutes: 10, autoSos: true, ...START })).body.walk;
  const due = new Date(walk.expectedArrival);

  let result = await checkWalks(new Date(due.getTime() - 1000));
  assert.equal(result.overdue, 0, "nothing happens before the deadline");

  result = await checkWalks(new Date(due.getTime() + 1000));
  assert.equal(result.overdue, 1);
  assert.equal((await SafeWalk.findById(walk._id)).status, "overdue");

  result = await checkWalks(new Date(due.getTime() + 1000 + GRACE_MS + 60000));
  assert.equal(result.alerted, 1);
  const updated = await SafeWalk.findById(walk._id);
  assert.equal(updated.status, "alerted");
  const sos = await EmergencyRequest.findById(updated.sosRequestId);
  assert.deepEqual(sos.targets, ["police"]);
  assert.equal(sos.type, "safety");
  assert.deepEqual([...sos.location.coordinates], [START.longitude, START.latitude]);

  assert.equal((await checkWalks(new Date(due.getTime() + 3 * GRACE_MS))).alerted, 0, "alerted only once");
});

test("adding time or opting out of auto-SOS prevents a police alert", async () => {
  const me = await makeUser("civilian");
  const quiet = (await api().post("/api/walks").set(me.auth).send({ minutes: 10, autoSos: false, ...START })).body.walk;
  const due = new Date(quiet.expectedArrival).getTime();
  await checkWalks(new Date(due + 1000));
  const late = await checkWalks(new Date(due + GRACE_MS + 120000));
  assert.equal(late.alerted, 0);
  assert.equal((await SafeWalk.findById(quiet._id)).status, "overdue");

  const extended = await api().post(`/api/walks/${quiet._id}/extend`).set(me.auth).send({ minutes: 10 });
  assert.equal(extended.body.walk.status, "active", "extending clears overdue");
});
