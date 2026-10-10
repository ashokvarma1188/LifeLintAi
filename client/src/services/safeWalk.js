import api from "./api";

/* "Walk with me": live location for a trip, with an automatic alert if you don't check in. */

export async function startWalk({ destination, minutes, autoSos, latitude, longitude }) {
  const { data } = await api.post("/walks", { destination, minutes, autoSos, latitude, longitude });
  return data.walk;
}

export async function getCurrentWalk() {
  const { data } = await api.get("/walks/current");
  return data.walk;
}

export async function sendWalkLocation(id, latitude, longitude) {
  const { data } = await api.patch(`/walks/${id}/location`, { latitude, longitude });
  return data.walk;
}

export async function extendWalk(id, minutes) {
  const { data } = await api.post(`/walks/${id}/extend`, { minutes });
  return data.walk;
}

export async function markArrived(id) {
  const { data } = await api.post(`/walks/${id}/arrived`);
  return data.walk;
}

export async function cancelWalk(id) {
  const { data } = await api.post(`/walks/${id}/cancel`);
  return data.walk;
}

export async function getPublicWalk(token) {
  const { data } = await api.get(`/public/walk/${token}`);
  return data;
}
