import api from "./api";

/* Daily medicine reminders — the server sends a push notification at each dose time (India time). */

export async function listMedicines() {
  const { data } = await api.get("/medicines");
  return data;
}

export async function addMedicine(medicine) {
  const { data } = await api.post("/medicines", medicine);
  return data.medicine;
}

export async function setMedicineActive(id, active) {
  const { data } = await api.put(`/medicines/${id}`, { active });
  return data.medicine;
}

export async function deleteMedicine(id) {
  await api.delete(`/medicines/${id}`);
}

export async function markDoseTaken(id, time, taken = true) {
  const { data } = await api.post(`/medicines/${id}/taken`, { time, taken });
  return data.medicine;
}
