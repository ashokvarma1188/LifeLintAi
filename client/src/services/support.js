import api from "./api";

export async function createTicket(subject, message) {
  const { data } = await api.post("/support/tickets", { subject, message });
  return data.ticket;
}

/** The signed-in civilian's own tickets. */
export async function myTickets() {
  const { data } = await api.get("/support/tickets/mine");
  return data.tickets;
}

/** Every ticket on the platform — admin only. */
export async function listAllTickets() {
  const { data } = await api.get("/support/tickets/all");
  return data.tickets;
}

export async function getTicket(id) {
  const { data } = await api.get(`/support/tickets/${id}`);
  return data.ticket;
}

export async function replyToTicket(id, message) {
  const { data } = await api.post(`/support/tickets/${id}/reply`, { message });
  return data.ticket;
}

export async function closeTicket(id) {
  const { data } = await api.patch(`/support/tickets/${id}/close`);
  return data.ticket;
}
