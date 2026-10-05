import api from "./api";

/** No auth needed — real counts for the landing page's live-network section. */
export async function getNetworkStats() {
  const { data } = await api.get("/public/network-stats");
  return data;
}
