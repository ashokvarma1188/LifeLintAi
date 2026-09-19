import api from "./api";

export async function listHospitals() {
  const { data } = await api.get("/hospitals");
  return data.hospitals;
}

export async function updateHospital(id, fields) {
  const { data } = await api.patch(`/hospitals/${id}`, fields);
  return data.hospital;
}
