/* AI report reader and symptom checker — with the AI switched off, as in every test. */
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, clear, api, makeUser } = require("./helpers");

before(start);
after(stop);
beforeEach(clear);

test("symptom checker: red-flag symptoms are always an emergency, in any language", async () => {
  const me = await makeUser("civilian");
  for (const symptoms of ["Sudden chest pain and sweating", "मेरे पिता बेहोश हो गए हैं", "ఛాతీ నొప్పి గా ఉంది"]) {
    const res = await api().post("/api/assistant/triage").set(me.auth).send({ symptoms });
    assert.equal(res.status, 200);
    assert.equal(res.body.level, "emergency", symptoms);
    assert.ok(res.body.redFlag);
    assert.ok(res.body.doNow.length > 0);
  }
});

test("symptom checker: without the AI, other symptoms safely default to seeing a doctor", async () => {
  const me = await makeUser("civilian");
  const res = await api().post("/api/assistant/triage").set(me.auth).send({ symptoms: "runny nose and sneezing for two days", ageGroup: "adult" });
  assert.equal(res.status, 200);
  assert.equal(res.body.level, "doctor");
  assert.equal(res.body.aiUsed, false);
  assert.equal(res.body.redFlag, null);
});

test("symptom checker needs symptoms and a login", async () => {
  const me = await makeUser("civilian");
  assert.equal((await api().post("/api/assistant/triage").set(me.auth).send({ symptoms: "" })).status, 400);
  assert.equal((await api().post("/api/assistant/triage").send({ symptoms: "headache" })).status, 401);
});

test("report reader checks the file, and says so when the AI isn't configured", async () => {
  const me = await makeUser("civilian");
  assert.equal((await api().post("/api/assistant/report").set(me.auth)).status, 400, "no file");

  const wrongType = await api().post("/api/assistant/report").set(me.auth).attach("file", Buffer.from("hello"), { filename: "notes.txt", contentType: "text/plain" });
  assert.equal(wrongType.status, 400);

  const pdf = await api()
    .post("/api/assistant/report")
    .set(me.auth)
    .attach("file", Buffer.from("%PDF-1.4 test"), { filename: "report.pdf", contentType: "application/pdf" });
  assert.equal(pdf.status, 503);
  assert.equal(pdf.body.configured, false);
});
