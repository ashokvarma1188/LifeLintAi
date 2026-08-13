import api from "./api";

export const ROLE_LABELS = {
  civilian: "Civilian",
  citizen: "Civilian",
  police: "Police",
  hospital: "Hospital",
  firestation: "Fire Station",
  pharmacy: "Pharmacy",
  admin: "Admin",
};

/** Roles a user may sign up as or request. Admin is CLI-only by design. */
export const REQUESTABLE_ROLES = [
  { value: "civilian", label: "Civilian", needsOrg: false },
  { value: "police", label: "Police", needsOrg: true },
  { value: "hospital", label: "Hospital", needsOrg: true },
  { value: "firestation", label: "Fire Station", needsOrg: true },
  { value: "pharmacy", label: "Pharmacy", needsOrg: true },
];

export const roleLabel = (role) => ROLE_LABELS[role] || role || "Civilian";

export const roleNeedsOrg = (role) =>
  REQUESTABLE_ROLES.find((r) => r.value === role)?.needsOrg ?? false;

export async function listPending() {
  const { data } = await api.get("/admin/pending");
  return data.users;
}

export async function listAllUsers() {
  const { data } = await api.get("/admin/all");
  return data.users;
}

export async function approveUser(userId) {
  const { data } = await api.post(`/admin/approve/${userId}`);
  return data.user;
}

export async function rejectUser(userId) {
  const { data } = await api.post(`/admin/reject/${userId}`);
  return data.user;
}

export async function requestRoleChange(role, orgName) {
  const { data } = await api.post("/auth/request-role-change", { role, orgName });
  return data;
}

/** Refreshes the cached user after a role change so the UI stays truthful. */
export async function refreshCurrentUser() {
  const { data } = await api.get("/auth/me");
  localStorage.setItem("user", JSON.stringify(data.user));
  return data.user;
}
