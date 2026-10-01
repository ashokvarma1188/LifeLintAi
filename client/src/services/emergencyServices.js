import api from "./api";

export async function listNearbyServices({ latitude, longitude, role } = {}) {
  const { data } = await api.get("/emergency-services/nearby", {
    params: { latitude, longitude, role },
  });
  return data.services;
}
