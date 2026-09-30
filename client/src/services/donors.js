import api from "./api";

export async function listDonors(bloodGroup) {
  const { data } = await api.get("/donors", { params: bloodGroup ? { bloodGroup } : {} });
  return data.donors;
}

export async function setDonorStatus(donorAvailable, bloodGroup) {
  const { data } = await api.put("/donors/me", { donorAvailable, bloodGroup });
  return data;
}
