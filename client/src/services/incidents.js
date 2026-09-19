import api from "./api";

/** Police and fire station share the same alerts/reports shape, just a different base path. */
export function createIncidentService(basePath) {
  return {
    async listAlerts() {
      const { data } = await api.get(`${basePath}/alerts`);
      return data.requests;
    },
    async listReports() {
      const { data } = await api.get(`${basePath}/reports`);
      return data.reports;
    },
    async createReport(fields) {
      const { data } = await api.post(`${basePath}/reports`, fields);
      return data.report;
    },
    async updateReportStatus(id, status) {
      const { data } = await api.patch(`${basePath}/reports/${id}`, { status });
      return data.report;
    },
  };
}
