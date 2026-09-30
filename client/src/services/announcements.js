import api from "./api";

export async function listActiveAnnouncements() {
  const { data } = await api.get("/announcements");
  return data.announcements;
}

export async function listAllAnnouncements() {
  const { data } = await api.get("/admin/announcements");
  return data.announcements;
}

export async function createAnnouncement(message) {
  const { data } = await api.post("/admin/announcements", { message });
  return data.announcement;
}

export async function deactivateAnnouncement(id) {
  const { data } = await api.post(`/admin/announcements/${id}/deactivate`);
  return data.announcement;
}
