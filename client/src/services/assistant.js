import api from "./api";

export async function sendMessage(message, history) {
  const { data } = await api.post("/assistant/chat", { message, history });
  return data.reply;
}
