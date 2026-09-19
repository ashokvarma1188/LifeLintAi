import api from "./api";
import { createIncidentService } from "./incidents";

export const { listAlerts, listReports, createReport, updateReportStatus } = createIncidentService("/firestation");

export async function getFleet() {
  const { data } = await api.get("/firestation/fleet");
  return data.fleet;
}

export async function updateFleet(fleet) {
  const { data } = await api.put("/firestation/fleet", { fleet });
  return data.fleet;
}
