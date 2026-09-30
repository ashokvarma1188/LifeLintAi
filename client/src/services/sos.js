import api from "./api";

/* Hospital side of the SOS flow — civilians create via api.post("/sos", ...) directly in Dashboard.jsx. */

export async function listSOS() {
  const { data } = await api.get("/sos");
  return data.requests;
}

/* Shared by any responder role (hospital/police/firestation) — the backend checks
   the request actually targets that responder's own service. */

export async function acceptSOS(id, etaMinutes) {
  const { data } = await api.patch(`/sos/${id}/accept`, etaMinutes !== undefined ? { etaMinutes } : {});
  return data.request;
}

export async function declineSOS(id) {
  const { data } = await api.patch(`/sos/${id}/decline`);
  return data.request;
}

export async function resolveSOS(id) {
  const { data } = await api.patch(`/sos/${id}/resolve`);
  return data.request;
}

/* Civilian side — my own SOS history. */

export async function myRequests() {
  const { data } = await api.get("/sos/mine");
  return data.requests;
}

export async function cancelSOS(id) {
  const { data } = await api.patch(`/sos/${id}/cancel`);
  return data.request;
}
