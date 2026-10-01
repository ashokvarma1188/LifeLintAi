import api from "./api";

export async function createBloodRequest(bloodGroup, unitsNeeded, notes) {
  const { data } = await api.post("/blood-requests", { bloodGroup, unitsNeeded, notes });
  return data.request;
}

/** Open requests this donor is compatible with and hasn't responded to yet. */
export async function listRequestsForDonor() {
  const { data } = await api.get("/blood-requests/for-donor");
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
