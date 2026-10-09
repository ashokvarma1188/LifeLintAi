import api from "./api";

export async function listDonors(bloodGroup) {
  const { data } = await api.get("/donors", { params: bloodGroup ? { bloodGroup } : {} });
  return data.donors;
}

export async function setDonorStatus(donorAvailable, bloodGroup) {
  const { data } = await api.put("/donors/me", { donorAvailable, bloodGroup });
  return data;
}

export async function getDonationStatus() {
  const { data } = await api.get("/donors/me/donations");
  return data;
}

export async function recordDonation() {
  const { data } = await api.post("/donors/me/donated");
  return data;
}
