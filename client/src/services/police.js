import { createIncidentService } from "./incidents";

export const { listAlerts, listReports, createReport, updateReportStatus } = createIncidentService("/police");
