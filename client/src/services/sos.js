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

export async function enRouteSOS(id) {
  const { data } = await api.patch(`/sos/${id}/en-route`);
  return data.request;
}

export async function resolveSOS(id, falseAlarm) {
  const { data } = await api.patch(`/sos/${id}/resolve`, falseAlarm !== undefined ? { falseAlarm } : {});
  return data.request;
}

/* Civilian side — my own SOS history. */

export async function myRequests() {
  const { data } = await api.get("/sos/mine");
  return data.requests;
}

export async function cancelSOS(id, reason) {
  const { data } = await api.patch(`/sos/${id}/cancel`, reason ? { reason } : {});
  return data.request;
}

/** A responder's own stats — covers the org owner plus any staff accounts under it. */
export async function getMyAnalytics() {
  const { data } = await api.get("/sos/my-analytics");
  return data;
}

/** A responder reports where they are so the civilian can watch help approach. */
export async function shareResponderLocation(latitude, longitude) {
  const { data } = await api.patch("/sos/responder-location", { latitude, longitude });
  return data;
}
