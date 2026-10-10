import api from "./api";

/** Open SOS alerts, hospital capacity and active Safety Checks for the live city map. */
export async function getControlRoom() {
  const { data } = await api.get("/control-room");
  return data;
}
