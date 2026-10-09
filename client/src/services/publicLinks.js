import api from "./api";

/* No auth — powers the page a civilian's family opens from a shared SOS link. */

export async function getTrack(token) {
  const { data } = await api.get(`/public/track/${token}`);
  return data;
}
