import api from "./api";

/* Chat thread on one SOS: text, scene photos and voice notes (civilian ↔ responders). */

export async function listMessages(requestId) {
  const { data } = await api.get(`/sos/${requestId}/messages`);
  return data;
}

export async function sendText(requestId, text) {
  const { data } = await api.post(`/sos/${requestId}/messages`, { text });
  return data.message;
}

export async function sendMedia(requestId, kind, file, filename) {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", file, filename);
  const { data } = await api.post(`/sos/${requestId}/messages/media`, form);
  return data.message;
}

/** Media needs the auth header, so it's fetched as a blob and shown through an object URL. */
export async function fetchMessageFile(messageId) {
  const { data } = await api.get(`/sos/messages/${messageId}/file`, { responseType: "blob" });
  return URL.createObjectURL(data);
}
