import api from "./api";

/* No auth — these power the pages opened from a shared SOS link and from a scanned Medical ID QR code. */

export async function getTrack(token) {
  const { data } = await api.get(`/public/track/${token}`);
  return data;
}

export async function getPublicMedicalId(token) {
  const { data } = await api.get(`/public/medical-id/${token}`);
  return data;
}
