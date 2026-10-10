const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, clear, api } = require("./helpers");

before(start);
after(stop);
beforeEach(clear);

const signup = (overrides = {}) =>
  api()
    .post("/api/auth/register")
    .send({ name: "Asha", email: "asha@example.test", password: "secret123", bloodGroup: "A+", phone: "9000000000", role: "civilian", ...overrides });

test("register creates an account and signs the user in", async () => {
  const res = await signup();
  assert.equal(res.status, 201);
  assert.ok(res.body.token, "a JWT comes back");
  assert.equal(res.body.user.email, "asha@example.test");
  assert.equal(res.body.user.password, undefined, "the password hash is never returned");
});

test("the same email cannot register twice", async () => {
  await signup();
  const res = await signup();
  assert.equal(res.status, 400);
});

test("organisation sign-ups wait for admin approval", async () => {
  const res = await signup({ email: "hosp@example.test", role: "hospital", orgName: "City Hospital" });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.roleStatus, "pending");
});

test("login works with the right password and fails with a wrong one", async () => {
  await signup();
  const wrong = await api().post("/api/auth/login").send({ email: "asha@example.test", password: "nope-nope" });
  assert.equal(wrong.status, 400);
  const right = await api().post("/api/auth/login").send({ email: "ASHA@example.test", password: "secret123" });
  assert.equal(right.status, 200);
  assert.ok(right.body.token);
});

test("protected routes need a valid token", async () => {
  assert.equal((await api().get("/api/auth/me")).status, 401);
  assert.equal((await api().get("/api/auth/me").set("Authorization", "Bearer forged.token.here")).status, 401);
  const { body } = await signup();
  const me = await api().get("/api/auth/me").set("Authorization", `Bearer ${body.token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, "asha@example.test");
});
