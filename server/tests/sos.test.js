const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, clear, api, makeUser } = require("./helpers");
const Hospital = require("../models/Hospital");

before(start);
after(stop);
beforeEach(clear);

const HERE = { latitude: 16.5062, longitude: 80.648 };

async function raiseSos(civ, body = {}) {
  return api().post("/api/sos").set(civ.auth).send({ ...HERE, type: "medical", targets: ["police"], ...body });
}

test("a civilian can raise an SOS and gets a family share link", async () => {
  const civ = await makeUser("civilian");
  const res = await raiseSos(civ);
  assert.equal(res.status, 201);
  assert.match(res.body.emergencyRequest.shareToken, /^[a-f0-9]{24}$/);
  assert.deepEqual(res.body.emergencyRequest.targets, ["police"]);
});

test("an SOS that alerts hospitals lists the nearest ones with free beds", async () => {
  await Hospital.create([
    { name: "Near", location: { type: "Point", coordinates: [80.649, 16.507] }, availableBeds: 12 },
    { name: "Far", location: { type: "Point", coordinates: [80.9, 16.9] }, availableBeds: 3 },
  ]);
  const civ = await makeUser("civilian");
  const res = await raiseSos(civ, { targets: ["hospital"] });
  assert.equal(res.body.nearbyHospitals[0].name, "Near");
  assert.equal(res.body.nearbyHospitals[0].availableBeds, 12);
});

test("only the alerted service can accept, and only once", async () => {
  const civ = await makeUser("civilian");
  const police = await makeUser("police");
  const police2 = await makeUser("police");
  const fire = await makeUser("firestation");
  const { body } = await raiseSos(civ);
  const id = body.emergencyRequest._id;

  assert.equal((await api().patch(`/api/sos/${id}/accept`).set(fire.auth)).status, 404, "fire station was not alerted");
  assert.equal((await api().patch(`/api/sos/${id}/accept`).set(police.auth).send({ etaMinutes: 6 })).status, 200);
  assert.equal((await api().patch(`/api/sos/${id}/accept`).set(police2.auth)).status, 409, "second responder loses the race");
  assert.equal((await api().patch(`/api/sos/${id}/accept`).set(civ.auth)).status, 403, "civilians cannot respond");
});

test("status moves pending → accepted → en route → resolved, never backwards", async () => {
  const civ = await makeUser("civilian");
  const police = await makeUser("police");
  const id = (await raiseSos(civ)).body.emergencyRequest._id;
  assert.equal((await api().patch(`/api/sos/${id}/en-route`).set(police.auth)).status, 409, "cannot skip accepting");
  await api().patch(`/api/sos/${id}/accept`).set(police.auth);
  assert.equal((await api().patch(`/api/sos/${id}/en-route`).set(police.auth)).status, 200);
  assert.equal((await api().patch(`/api/sos/${id}/resolve`).set(police.auth)).status, 200);
  assert.equal((await api().patch(`/api/sos/${id}/accept`).set(police.auth)).status, 409);
});

test("a civilian can cancel their own pending alert only", async () => {
  const civ = await makeUser("civilian");
  const other = await makeUser("civilian");
  const police = await makeUser("police");
  const id = (await raiseSos(civ)).body.emergencyRequest._id;
  assert.equal((await api().patch(`/api/sos/${id}/cancel`).set(other.auth)).status, 404);
  assert.equal((await api().patch(`/api/sos/${id}/cancel`).set(civ.auth).send({ reason: "safe_now" })).status, 200);
  const id2 = (await raiseSos(civ)).body.emergencyRequest._id;
  await api().patch(`/api/sos/${id2}/accept`).set(police.auth);
  assert.equal((await api().patch(`/api/sos/${id2}/cancel`).set(civ.auth)).status, 400, "already accepted");
});

test("the responder's live position reaches the public tracking page", async () => {
  const civ = await makeUser("civilian", { phone: "9123456789" });
  const police = await makeUser("police");
  const { emergencyRequest } = (await raiseSos(civ)).body;
  await api().patch(`/api/sos/${emergencyRequest._id}/accept`).set(police.auth);
  await api().patch("/api/sos/responder-location").set(police.auth).send({ latitude: 16.51, longitude: 80.65 });

  const track = await api().get(`/api/public/track/${emergencyRequest.shareToken}`);
  assert.equal(track.status, 200);
  assert.equal(track.body.status, "accepted");
  assert.deepEqual(track.body.responderLocation, [80.65, 16.51]);
  assert.ok(!JSON.stringify(track.body).includes("9123456789"), "no phone number on the public page");
  assert.equal((await api().get("/api/public/track/0000000000000000000000ff")).status, 404);
});
