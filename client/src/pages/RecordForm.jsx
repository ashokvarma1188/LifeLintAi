import { useState } from "react";
import { RECORD_TYPES } from "../services/healthRecords";
import { useLang } from "../i18n/context";

const EMPTY = {
  title: "",
  recordType: "consultation",
  recordDate: new Date().toISOString().slice(0, 10),
  hospitalName: "",
  doctorName: "",
  bloodPressure: "",
  heartRate: "",
  bloodSugar: "",
  weight: "",
  notes: "",
  recommendations: "",
  followUpDate: "",
};

/**
 * Add/edit form for a medical report. Shared by the patient's own records page
 * and the hospital's patient file, so both write identical data.
 */
function RecordForm({ initial, onSubmit, onCancel, submitLabel = "Save report", showHospitalName = true }) {
  const { t } = useLang();
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...(initial
      ? {
          ...initial,
          heartRate: initial.heartRate ?? "",
          bloodSugar: initial.bloodSugar ?? "",
          weight: initial.weight ?? "",
        }
      : {}),
  }));
  const [pdfFile, setPdfFile] = useState(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const pickPdf = (e) => {
    const file = e.target.files?.[0];
    if (!file) return setPdfFile(null);

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError(t("Only PDF medical reports are allowed"));
      e.target.value = "";
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError(t("PDF must be smaller than 4 MB"));
      e.target.value = "";
      return;
    }
    setError("");
    setPdfFile(file);
    setRemovePdf(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError(t("Report title is required"));
    if (!form.recordDate) return setError(t("Report date is required"));

    setSaving(true);
    try {
      await onSubmit(form, pdfFile, removePdf);
    } catch (err) {
      setError(err.response?.data?.message || t("Could not save the report. Please try again."));
      setSaving(false);
    }
  };

  const existingPdf = initial?.pdf?.filename;

  return (
    <form className="portal-form" onSubmit={submit}>
      {error && <div className="portal-message error">{error}</div>}

      <div className="portal-field">
        <label htmlFor="title">{t("Report title *")}</label>
        <input id="title" name="title" value={form.title} onChange={change} placeholder={t("e.g. Complete blood count")} />
      </div>

      <div className="portal-row">
        <div className="portal-field">
          <label htmlFor="recordType">{t("Type")}</label>
          <select id="recordType" name="recordType" value={form.recordType} onChange={change}>
            {RECORD_TYPES.map((recordType) => (
              <option key={recordType.value} value={recordType.value}>{t(recordType.label)}</option>
            ))}
          </select>
        </div>
        <div className="portal-field">
          <label htmlFor="recordDate">{t("Date *")}</label>
          <input id="recordDate" type="date" name="recordDate" value={form.recordDate} onChange={change} />
        </div>
      </div>

      <div className="portal-row">
        {showHospitalName && (
          <div className="portal-field">
            <label htmlFor="hospitalName">{t("Hospital / lab")}</label>
            <input id="hospitalName" name="hospitalName" value={form.hospitalName} onChange={change} placeholder="Apollo Hospital" />
          </div>
        )}
        <div className="portal-field">
          <label htmlFor="doctorName">{t("Doctor")}</label>
          <input id="doctorName" name="doctorName" value={form.doctorName} onChange={change} placeholder="Dr. Mehta" />
        </div>
      </div>

      <div className="portal-row">
        <div className="portal-field">
          <label htmlFor="bloodPressure">{t("Blood pressure")}</label>
          <input id="bloodPressure" name="bloodPressure" value={form.bloodPressure} onChange={change} placeholder="120/80" />
        </div>
        <div className="portal-field">
          <label htmlFor="heartRate">{t("Heart rate (bpm)")}</label>
          <input id="heartRate" type="number" name="heartRate" value={form.heartRate} onChange={change} placeholder="72" />
        </div>
        <div className="portal-field">
          <label htmlFor="bloodSugar">{t("Blood sugar (mg/dL)")}</label>
          <input id="bloodSugar" type="number" name="bloodSugar" value={form.bloodSugar} onChange={change} placeholder="98" />
        </div>
        <div className="portal-field">
          <label htmlFor="weight">{t("Weight (kg)")}</label>
          <input id="weight" type="number" step="0.1" name="weight" value={form.weight} onChange={change} placeholder="70" />
        </div>
      </div>

      <div className="portal-field">
        <label htmlFor="notes">{t("Notes")}</label>
        <textarea id="notes" name="notes" value={form.notes} onChange={change} placeholder={t("Findings, symptoms, observations…")} />
      </div>

      <div className="portal-field">
        <label htmlFor="recommendations">{t("Recommendations")}</label>
        <textarea id="recommendations" name="recommendations" value={form.recommendations} onChange={change} placeholder={t("Medication, follow-up, advice…")} />
      </div>

      <div className="portal-field">
        <label htmlFor="followUpDate">{t("Follow-up / reminder date")}</label>
        <input id="followUpDate" type="date" name="followUpDate" value={form.followUpDate} onChange={change} />
        <span className="hint">{t("Optional — shows a reminder on your dashboard a few days before this date.")}</span>
      </div>

      <div className="portal-field">
        <label htmlFor="pdf">{t("Attach PDF report")}</label>
        <input id="pdf" type="file" accept="application/pdf,.pdf" onChange={pickPdf} />
        <span className="hint">
          {pdfFile
            ? `Selected: ${pdfFile.name}`
            : existingPdf && !removePdf
              ? `Current file: ${existingPdf}`
              : "Optional. PDF only, up to 4 MB."}
        </span>
        {existingPdf && !pdfFile && !removePdf && (
          <button type="button" className="portal-btn ghost small" onClick={() => setRemovePdf(true)}>
            {t("Remove attached PDF")}
          </button>
        )}
        {removePdf && <span className="hint">{t("PDF will be removed when you save.")}</span>}
      </div>

      <div className="portal-form-actions">
        <button type="button" className="portal-btn ghost" onClick={onCancel} disabled={saving}>
          {t("Cancel")}
        </button>
        <button type="submit" className="portal-btn primary" disabled={saving}>
          {saving ? t("Saving…") : t(submitLabel)}
        </button>
      </div>
    </form>
  );
}

export default RecordForm;
