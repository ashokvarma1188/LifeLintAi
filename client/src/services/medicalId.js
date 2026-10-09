import api from "./api";

/** Switches the QR-code Medical ID on, or rotates its link (which invalidates old printed codes). */
export async function enableMedicalIdLink() {
  const { data } = await api.post("/profile/medical-id-link");
  return data.medicalIdToken;
}

export async function disableMedicalIdLink() {
  await api.delete("/profile/medical-id-link");
}
