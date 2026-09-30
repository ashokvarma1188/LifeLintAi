import api from "./api";

/** `photo`, when given, is sent as multipart along with the message/history. */
export async function sendMessage(message, history, photo) {
  if (photo) {
    const form = new FormData();
    form.append("message", message || "");
    form.append("history", JSON.stringify(history || []));
    form.append("photo", photo);
    const { data } = await api.post("/assistant/chat", form);
    return data.reply;
  }

  const { data } = await api.post("/assistant/chat", { message, history });
  return data.reply;
}
