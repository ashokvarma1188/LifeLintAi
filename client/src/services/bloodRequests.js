import api from "./api";

export async function createBloodRequest(bloodGroup, unitsNeeded, notes, coords) {
  const { data } = await api.post("/blood-requests", {
    bloodGroup,
    unitsNeeded,
    notes,
    latitude: coords?.latitude,
    longitude: coords?.longitude,
  });
  return data.request;
}

/** Open requests this donor is compatible with and hasn't responded to yet — nearest first if coords are given. */
export async function listRequestsForDonor(coords) {
  const params = coords ? { latitude: coords.latitude, longitude: coords.longitude } : {};
  const { data } = await api.get("/blood-requests/for-donor", { params });
  return data.requests;
}

/** The civilian's own requests, with who's accepted/declined. */
export async function myBloodRequests() {
  const { data } = await api.get("/blood-requests/mine");
  return data.requests;
}

export async function respondToBloodRequest(id, status) {
  const { data } = await api.patch(`/blood-requests/${id}/respond`, { status });
  return data.request;
}

export async function fulfilBloodRequest(id) {
  const { data } = await api.patch(`/blood-requests/${id}/fulfil`);
  return data.request;
}

export async function cancelBloodRequest(id) {
  const { data } = await api.patch(`/blood-requests/${id}/cancel`);
  return data.request;
}
