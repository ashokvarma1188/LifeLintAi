import api from "./api";

/* AI health tools. Nothing sent here is stored on the server. */

/** Explains a lab report (photo or PDF) in plain words, in the chosen language. */
export async function explainReport(file, language) {
  const form = new FormData();
  form.append("file", file);
  form.append("language", language);
  const { data } = await api.post("/assistant/report", form, { timeout: 90000 });
  return data;
}

/** Sorts symptoms into emergency / doctor / home care. */
export async function checkSymptoms({ symptoms, ageGroup, language }) {
  const { data } = await api.post("/assistant/triage", { symptoms, ageGroup, language }, { timeout: 60000 });
  return data;
}
