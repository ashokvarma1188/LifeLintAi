/* Blood donation camps, the first-aid course, and certificates anyone can verify. */
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, clear, api, makeUser } = require("./helpers");
const Hospital = require("../models/Hospital");
const DonationCamp = require("../models/DonationCamp");
const { QUESTIONS } = require("../constants/firstAidQuiz");

before(start);
after(stop);
beforeEach(clear);

const HOUR = 60 * 60 * 1000;
const inHours = (h) => new Date(Date.now() + h * HOUR).toISOString();

const hospitalWithLocation = async () => {
  const hospital = await makeUser("hospital", { orgName: "City Hospital" });
  await Hospital.create({ name: "City Hospital", ownerId: hospital.user._id, location: { type: "Point", coordinates: [80.64, 16.5] } });
  return hospital;
};

const newCamp = (hospital, extra = {}) =>
  api().post("/api/camps").set(hospital.auth).send({ title: "Mega blood camp", venue: "Town Hall", startsAt: inHours(24), endsAt: inHours(30), capacity: 5, ...extra });

test("hospitals post camps at their own location; others can't", async () => {
  const hospital = await hospitalWithLocation();
  const civilian = await makeUser("civilian");
  assert.equal((await newCamp(civilian)).status, 403);
  assert.equal((await newCamp(hospital, { endsAt: inHours(20) })).status, 400, "ends before it starts");
  const res = await newCamp(hospital);
  assert.equal(res.status, 201);
  assert.deepEqual(res.body.camp.coordinates, [80.64, 16.5]);
  assert.equal(res.body.camp.organiserName, "City Hospital");
});

test("civilians register; full camps and resting donors are turned away", async () => {
  const hospital = await hospitalWithLocation();
  const camp = (await newCamp(hospital)).body.camp;
  const donors = await Promise.all([1, 2, 3, 4, 5].map(() => makeUser("civilian")));
  for (const donor of donors) assert.equal((await api().post(`/api/camps/${camp._id}/register`).set(donor.auth)).status, 200);
  assert.equal((await api().post(`/api/camps/${camp._id}/register`).set(donors[0].auth)).status, 400, "already registered");

  const sixth = await makeUser("civilian");
  assert.equal((await api().post(`/api/camps/${camp._id}/register`).set(sixth.auth)).body.message, "Sorry, this camp is full.");

  await api().delete(`/api/camps/${camp._id}/register`).set(donors[4].auth);
  const resting = await makeUser("civilian", { lastDonatedAt: new Date() });
  assert.equal((await api().post(`/api/camps/${camp._id}/register`).set(resting.auth)).status, 400, "still resting on camp day");

  const list = await api().get("/api/camps").set(donors[0].auth).query({ latitude: 16.5, longitude: 80.64 });
  assert.equal(list.body.camps[0].isRegistered, true);
  assert.equal(list.body.camps[0].registeredCount, 4);
  assert.equal(list.body.camps[0].distanceKm, 0);
});

test("marking a donor as donated records the donation and gives a verifiable certificate", async () => {
  const hospital = await hospitalWithLocation();
  const donor = await makeUser("civilian", { name: "Sita Devi", bloodGroup: "B+" });
  const camp = (await newCamp(hospital)).body.camp;
  await api().post(`/api/camps/${camp._id}/register`).set(donor.auth);

  assert.equal((await api().post(`/api/camps/${camp._id}/donated/${donor.user._id}`).set(hospital.auth)).status, 400, "camp hasn't started");
  await DonationCamp.updateOne({ _id: camp._id }, { startsAt: new Date(Date.now() - HOUR) });
  const other = await makeUser("hospital");
  assert.equal((await api().post(`/api/camps/${camp._id}/donated/${donor.user._id}`).set(other.auth)).status, 404, "not their camp");
  const marked = await api().post(`/api/camps/${camp._id}/donated/${donor.user._id}`).set(hospital.auth);
  assert.equal(marked.status, 200);
  assert.equal(marked.body.donationCount, 1);
  assert.equal((await api().post(`/api/camps/${camp._id}/donated/${donor.user._id}`).set(hospital.auth)).status, 400, "only once");

  const mine = await api().get("/api/camps/mine").set(hospital.auth);
  assert.ok(mine.body.camps[0].registrations[0].donatedAt);

  const cert = await api().post("/api/certificates/donation").set(donor.auth);
  assert.equal(cert.status, 200);
  assert.match(cert.body.certificate.code, /^LL-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.match(cert.body.certificate.detail, /Mega blood camp, Town Hall/);
  const again = await api().post("/api/certificates/donation").set(donor.auth);
  assert.equal(again.body.certificate.code, cert.body.certificate.code, "same donation, same certificate");

  const verify = await api().get(`/api/public/certificates/${cert.body.certificate.code}`);
  assert.equal(verify.body.certificate.recipientName, "Sita Devi");
  assert.equal(verify.body.certificate.meta.bloodGroup, undefined, "blood group not public");
  assert.equal((await api().get("/api/public/certificates/LL-AAAA-AAAA")).status, 404);
});

test("no donation certificate before a donation", async () => {
  const me = await makeUser("civilian");
  assert.equal((await api().post("/api/certificates/donation").set(me.auth)).status, 400);
});

test("first-aid course: answers stay hidden, 8/10 passes, and the certificate verifies", async () => {
  const me = await makeUser("civilian", { name: "Kiran Rao" });
  const quiz = await api().get("/api/course/quiz").set(me.auth);
  assert.equal(quiz.body.questions.length, 10);
  assert.ok(!JSON.stringify(quiz.body).includes("\"answer\""), "answers never sent");

  assert.equal((await api().post("/api/course/submit").set(me.auth).send({ answers: [1, 2] })).status, 400, "all questions needed");

  const wrong = QUESTIONS.map((q) => (q.answer + 1) % q.options.length);
  const failed = await api().post("/api/course/submit").set(me.auth).send({ answers: wrong });
  assert.equal(failed.body.passed, false);
  assert.equal(failed.body.certificate, null);

  const eightRight = QUESTIONS.map((q, i) => (i < 8 ? q.answer : (q.answer + 1) % q.options.length));
  const passed = await api().post("/api/course/submit").set(me.auth).send({ answers: eightRight });
  assert.equal(passed.body.score, 8);
  assert.equal(passed.body.passed, true);
  const code = passed.body.certificate.code;

  const perfect = await api().post("/api/course/submit").set(me.auth).send({ answers: QUESTIONS.map((q) => q.answer) });
  assert.equal(perfect.body.certificate.code, code, "one certificate per person");
  assert.equal(perfect.body.certificate.meta.score, 10, "best score kept");

  const status = await api().get("/api/course/status").set(me.auth);
  assert.equal(status.body.passed, true);
  assert.equal(status.body.bestScore, 10);
  assert.equal((await api().get(`/api/public/certificates/${code}`)).body.certificate.title, "First-Aid Aware");
});
