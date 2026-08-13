/*
 * Role vocabulary.
 *
 * "citizen" predates the multi-role portal and is still stored on older
 * accounts, so it is kept as an alias of "civilian" rather than migrated —
 * both apps read the same users collection.
 */

const CIVILIAN_ROLES = ["civilian", "citizen"];

const ORG_ROLES = ["police", "hospital", "firestation", "pharmacy"];

// Roles a user may sign up as or request. "admin" is deliberately absent —
// admins are created by the CLI script only, never through the API.
const VALID_ROLES = ["civilian", ...ORG_ROLES];

const ALL_ROLES = ["civilian", "citizen", ...ORG_ROLES, "admin"];

const ROLE_STATUSES = ["pending", "approved", "rejected"];

const ROLE_LABELS = {
  civilian: "Civilian",
  citizen: "Civilian",
  police: "Police",
  hospital: "Hospital",
  firestation: "Fire Station",
  pharmacy: "Pharmacy",
  admin: "Admin",
};

const isCivilian = (role) => CIVILIAN_ROLES.includes(role || "civilian");

const isOrgRole = (role) => ORG_ROLES.includes(role);

module.exports = {
  CIVILIAN_ROLES,
  ORG_ROLES,
  VALID_ROLES,
  ALL_ROLES,
  ROLE_STATUSES,
  ROLE_LABELS,
  isCivilian,
  isOrgRole,
};
