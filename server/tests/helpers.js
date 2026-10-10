/*
 * Shared test setup: a throwaway in-memory MongoDB (never the real database), the
 * Express app, and quick ways to make users and auth tokens. Email is left
 * unconfigured so no test can ever send a real message.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-not-used-anywhere-else";
for (const key of ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_USER", "GEMINI_API_KEY"]) {
  process.env[key] = "";
}

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const request = require("supertest");

let mongod;
let app;

async function start() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = require("../app");
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
  return app;
}

async function stop() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function clear() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

const api = () => request(app);

let counter = 0;
/** Creates an approved user straight in the database and returns { user, token, auth }. */
async function makeUser(role = "civilian", extra = {}) {
  const User = require("../models/User");
  counter += 1;
  const user = await User.create({
    name: `Test ${role} ${counter}`,
    email: `test-${role}-${counter}@example.test`,
    password: "not-a-real-hash",
    role,
    roleStatus: "approved",
    emailVerified: true,
    ...extra,
  });
  const token = jwt.sign({ id: user._id, role: user.role, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: "1h" });
  return { user, token, auth: { Authorization: `Bearer ${token}` } };
}

module.exports = { start, stop, clear, api, makeUser };
