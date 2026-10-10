const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, clear, api, makeUser } = require("./helpers");

before(start);
after(stop);
beforeEach(clear);

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function scenario() {
  const civ = await makeUser("civilian");
  const police = await makeUser("police", { orgName: "Benz Circle Police" });
  const res = await api().post("/api/sos").set(civ.auth).send({ latitude: 16.5, longitude: 80.6, targets: ["police"] });
  return { civ, police, id: res.body.emergencyRequest._id };
}

test("civilian and alerted responder can chat; others cannot see it", async () => {
  const { civ, police, id } = await scenario();
  const outsider = await makeUser("civilian");
  const hospital = await makeUser("hospital");

  assert.equal((await api().post(`/api/sos/${id}/messages`).set(civ.auth).send({ text: "Leg is bleeding" })).status, 201);
  assert.equal((await api().post(`/api/sos/${id}/messages`).set(police.auth).send({ text: "5 minutes away" })).status, 201);
  assert.equal((await api().get(`/api/sos/${id}/messages`).set(outsider.auth)).status, 404);
  assert.equal((await api().get(`/api/sos/${id}/messages`).set(hospital.auth)).status, 404, "hospital was not alerted");

  const thread = await api().get(`/api/sos/${id}/messages`).set(civ.auth);
  assert.deepEqual(thread.body.messages.map((m) => m.text), ["Leg is bleeding", "5 minutes away"]);
  assert.equal(thread.body.messages[1].senderName, "Benz Circle Police");
  assert.equal(thread.body.messages[0].mine, true);
});

test("photos and voice notes are checked and only served to people in the thread", async () => {
  const { civ, police, id } = await scenario();
  const outsider = await makeUser("civilian");

  const photo = await api().post(`/api/sos/${id}/messages/media`).set(civ.auth).field("kind", "photo").attach("file", PNG, { filename: "scene.png", contentType: "image/png" });
  assert.equal(photo.status, 201);
  const voice = await api().post(`/api/sos/${id}/messages/media`).set(civ.auth).field("kind", "voice").attach("file", Buffer.alloc(512, 1), { filename: "note.webm", contentType: "audio/webm" });
  assert.equal(voice.status, 201);

  const exe = await api().post(`/api/sos/${id}/messages/media`).set(civ.auth).field("kind", "photo").attach("file", Buffer.from("MZ"), { filename: "x.exe", contentType: "application/x-msdownload" });
  assert.equal(exe.status, 400, "non-media files are rejected");
  const mismatch = await api().post(`/api/sos/${id}/messages/media`).set(civ.auth).field("kind", "voice").attach("file", PNG, { filename: "x.png", contentType: "image/png" });
  assert.equal(mismatch.status, 400, "a photo cannot pose as a voice note");

  const file = await api().get(`/api/sos/messages/${photo.body.message._id}/file`).set(police.auth);
  assert.equal(file.status, 200);
  assert.equal(file.headers["content-type"], "image/png");
  assert.equal((await api().get(`/api/sos/messages/${photo.body.message._id}/file`).set(outsider.auth)).status, 404);
});

test("the chat becomes read-only once the alert is closed", async () => {
  const { civ, police, id } = await scenario();
  await api().patch(`/api/sos/${id}/accept`).set(police.auth);
  await api().patch(`/api/sos/${id}/resolve`).set(police.auth);
  assert.equal((await api().post(`/api/sos/${id}/messages`).set(civ.auth).send({ text: "hello?" })).status, 400);
  const thread = await api().get(`/api/sos/${id}/messages`).set(civ.auth);
  assert.equal(thread.body.open, false);
});
