import api from "./api";

export async function getOrgProfile() {
  const { data } = await api.get("/org-profile/me");
  return data;
}

export async function updateOrgProfile(fields) {
  const { data } = await api.put("/org-profile/me", fields);
  return data.profile;
}

export async function listStaff() {
  const { data } = await api.get("/org-profile/staff");
  return data.staff;
}

export async function createStaff(fields) {
  const { data } = await api.post("/org-profile/staff", fields);
  return data.staff;
}

export async function removeStaff(id) {
  await api.delete(`/org-profile/staff/${id}`);
}
