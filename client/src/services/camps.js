import api from "./api";

/* Blood donation camps: hospitals post them, civilians register. */

export async function listCamps(coords) {
  const { data } = await api.get("/camps", { params: coords || {} });
  return data.camps;
}

export async function registerForCamp(id) {
  const { data } = await api.post(`/camps/${id}/register`);
  return data.camp;
}

export async function cancelRegistration(id) {
  const { data } = await api.delete(`/camps/${id}/register`);
  return data.camp;
}

export async function listMyCamps() {
  const { data } = await api.get("/camps/mine");
  return data.camps;
}

export async function createCamp(camp) {
  const { data } = await api.post("/camps", camp);
  return data.camp;
}

export async function cancelCamp(id) {
  const { data } = await api.delete(`/camps/${id}`);
  return data;
}

export async function markDonated(campId, userId) {
  const { data } = await api.post(`/camps/${campId}/donated/${userId}`);
  return data;
}
