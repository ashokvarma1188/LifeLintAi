import api from "./api";

/* Hospital side of the SOS flow — civilians create via api.post("/sos", ...) directly in Dashboard.jsx. */

export async function listSOS() {
  const { data } = await api.get("/sos");
  return data.requests;
}

export async function acceptSOS(id) {
  const { data } = await api.patch(`/sos/${id}/accept`);
  return data.request;
}

export async function resolveSOS(id) {
  const { data } = await api.patch(`/sos/${id}/resolve`);
  return data.request;
}
