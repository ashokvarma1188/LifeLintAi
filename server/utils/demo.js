/*
 * Demo accounts (any @demo.lifelink.app email) live in a sandbox on the real site:
 * their SOS alerts are tagged `demo`, demo responders only see demo alerts, and real
 * responders never see (or get notified about) them. Anyone can try the demo from the
 * login page without seeing real people's emergencies.
 */
const DEMO_DOMAIN = "@demo.lifelink.app";
const DEMO_EMAIL = /@demo\.lifelink\.app$/i;

const isDemoUser = (user) => String(user?.email || "").toLowerCase().endsWith(DEMO_DOMAIN);

/** Mongo filter that keeps a user to their own side of the sandbox. Admins see everything. */
const sandboxFilter = (user) => {
  if (user?.role === "admin") return {};
  return isDemoUser(user) ? { demo: true } : { demo: { $ne: true } };
};

const sameSide = (user, request) => user?.role === "admin" || Boolean(request?.demo) === isDemoUser(user);

module.exports = { DEMO_DOMAIN, DEMO_EMAIL, isDemoUser, sandboxFilter, sameSide };
