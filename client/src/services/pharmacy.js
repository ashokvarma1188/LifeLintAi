import api from "./api";

export async function getStock() {
  const { data } = await api.get("/pharmacy/stock");
  return data;
}

export async function updateStock(stock) {
  const { data } = await api.put("/pharmacy/stock", { stock });
  return data.stock;
}

export async function updateAvailability(fields) {
  const { data } = await api.put("/pharmacy/availability", fields);
  return data;
}

export async function listRequests() {
  const { data } = await api.get("/pharmacy/requests");
  return data.requests;
}
