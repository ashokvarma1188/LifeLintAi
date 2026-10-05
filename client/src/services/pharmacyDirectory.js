import api from "./api";

export async function listPharmacies(latitude, longitude) {
  const params = latitude != null && longitude != null ? { latitude, longitude } : {};
  const { data } = await api.get("/pharmacies", { params });
  return data.pharmacies;
}

export async function requestMedicine(pharmacyId, medicineName, notes) {
  const { data } = await api.post(`/pharmacies/${pharmacyId}/requests`, { medicineName, notes });
  return data.request;
}

export async function myMedicineRequests() {
  const { data } = await api.get("/pharmacies/requests/mine");
  return data.requests;
}
