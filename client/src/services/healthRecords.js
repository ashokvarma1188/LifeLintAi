import api from "./api";

export const RECORD_TYPES = [
  { value: "consultation", label: "Consultation" },
  { value: "lab", label: "Lab report" },
  { value: "prescription", label: "Prescription" },
  { value: "scan", label: "Scan / X-Ray" },
  { value: "discharge", label: "Discharge summary" },
  { value: "vaccination", label: "Vaccination" },
  { value: "other", label: "Other" },
];

export const recordTypeLabel = (value) =>
  RECORD_TYPES.find((t) => t.value === value)?.label || "Other";

/* The API takes multipart because a record can carry a PDF. */
function toFormData(form, pdfFile, extra = {}) {
  const data = new FormData();
  Object.entries({ ...form, ...extra }).forEach(([key, value]) => {
    if (value !== undefined && value !== null) data.append(key, value);
  });
  if (pdfFile) data.append("pdf", pdfFile);
  return data;
}

export async function listRecords(params = {}) {
  const { data } = await api.get("/health-records", { params });
  return data.records;
}

export async function getStats() {
  const { data } = await api.get("/health-records/stats/summary");
  return data;
}

export async function createRecord(form, pdfFile) {
  const { data } = await api.post("/health-records", toFormData(form, pdfFile));
  return data.record;
}

export async function updateRecord(id, form, pdfFile, removePdf = false) {
  const { data } = await api.put(
    `/health-records/${id}`,
    toFormData(form, pdfFile, removePdf ? { removePdf: "true" } : {})
  );
  return data.record;
}

export async function deleteRecord(id) {
  await api.delete(`/health-records/${id}`);
}

/**
 * PDFs sit behind the auth header, so they can't be opened with a plain link.
 * Fetch as a blob and hand the browser an object URL instead.
 */
export async function openRecordPdf(id) {
  const response = await api.get(`/health-records/${id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  window.open(url, "_blank", "noopener");
  // Give the new tab time to load before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ------------------------------------------------------------ hospital side */

export async function searchPatient(phone) {
  const { data } = await api.get("/hospital/patients/search", { params: { phone } });
  return data.patient;
}

export async function getPatientRecords(patientId) {
  const { data } = await api.get(`/hospital/patients/${patientId}/records`);
  return data;
}

export async function createPatientRecord(patientId, form, pdfFile) {
  const { data } = await api.post(
    `/hospital/patients/${patientId}/records`,
    toFormData(form, pdfFile)
  );
  return data.record;
}
