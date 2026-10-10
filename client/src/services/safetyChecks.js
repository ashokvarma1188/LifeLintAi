import api from "./api";

/* Disaster Safety Check. Admins declare an area; civilians answer "Are you safe?". */

export async function listActiveChecks() {
  const { data } = await api.get("/safety-checks/active");
  return data.checks;
}

export async function respondToCheck(id, { status, latitude, longitude, note }) {
  const { data } = await api.post(`/safety-checks/${id}/respond`, { status, latitude, longitude, note });
  return data.response;
}

export async function listChecks() {
  const { data } = await api.get("/safety-checks");
  return data.checks;
}

export async function getCheck(id) {
  const { data } = await api.get(`/safety-checks/${id}`);
  return data;
}

export async function createCheck(check) {
  const { data } = await api.post("/safety-checks", check);
  return data.check;
}

export async function closeCheck(id) {
  const { data } = await api.post(`/safety-checks/${id}/close`);
  return data.check;
}
