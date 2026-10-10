import { useState } from "react";
import { FileDown } from "lucide-react";
import api, { getErrorMessage } from "../services/api";
import { listMedicines } from "../services/medicines";
import { listRecords } from "../services/healthRecords";
import { useLang } from "../i18n/context";

/** One click: a one-page PDF with blood group, allergies, medicines, vitals and contacts. */
function HealthSummaryButton({ className = "portal-btn ghost" }) {
  const { t, lang } = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const download = async () => {
    setBusy(true);
    setError("");
    try {
      const [profile, meds, records] = await Promise.all([
        api.get("/profile/me").then((r) => r.data),
        listMedicines().then((d) => d.medicines).catch(() => []),
        listRecords().catch(() => []),
      ]);
      const { downloadHealthSummary } = await import("../utils/pdf");
      await downloadHealthSummary({ profile, medicines: meds, records }, t, lang);
    } catch (err) {
      setError(getErrorMessage(err, "Could not make the PDF. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <button className={className} onClick={download} disabled={busy}>
        <FileDown size={16} /> {busy ? t("Preparing PDF…") : t("Health summary PDF")}
      </button>
      {error && <span style={{ fontSize: 12, color: "var(--error-text)" }}>{t(error)}</span>}
    </span>
  );
}

export default HealthSummaryButton;
