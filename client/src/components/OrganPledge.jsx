import { useState } from "react";
import { HeartHandshake, ExternalLink } from "lucide-react";
import api, { getErrorMessage } from "../services/api";
import { useLang } from "../i18n/context";
import "./OrganPledge.css";

const PLEDGE_ORGANS = ["Kidneys", "Liver", "Heart", "Lungs", "Pancreas", "Eyes (corneas)", "Skin", "Bone & tissue"];

/** Organ-donor pledge on the Medical ID page — shown on the ID card and the public QR page. */
function OrganPledge({ initial }) {
  const { t } = useLang();
  const [pledge, setPledge] = useState(initial?.pledged ? initial : null);
  const [editing, setEditing] = useState(false);
  const [organs, setOrgans] = useState(initial?.organs || []);
  const [familyInformed, setFamilyInformed] = useState(Boolean(initial?.familyInformed));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (pledged) => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.put("/profile/organ-pledge", { pledged, organs, familyInformed });
      setPledge(data.organPledge.pledged ? data.organPledge : null);
      setEditing(false);
      if (!pledged) setOrgans([]);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save your pledge."));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (organ) => setOrgans((list) => (list.includes(organ) ? list.filter((o) => o !== organ) : [...list, organ]));

  return (
    <div className="organ-pledge">
      <div className="organ-pledge-head">
        <HeartHandshake size={18} />
        <strong>{t("Organ donor pledge")}</strong>
        {pledge && !editing && <span className="organ-badge">{t("Pledged")}</span>}
      </div>

      {error && <div className="portal-message error">{t(error)}</div>}

      {pledge && !editing ? (
        <>
          <p>
            {t("You pledged to donate:")} <strong>{pledge.organs.map((o) => t(o)).join(", ")}</strong>
          </p>
          <p className="organ-note">
            {pledge.familyInformed ? t("Your family knows about your wish.") : t("Tell your family — they are asked for consent when the time comes.")}
          </p>
          <div className="organ-actions">
            <button className="portal-btn ghost small" onClick={() => setEditing(true)}>
              {t("Change")}
            </button>
            <button className="portal-btn ghost small" disabled={busy} onClick={() => save(false)}>
              {t("Withdraw pledge")}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{t("One donor can save up to 8 lives. Choose what you would like to donate — it shows on your Medical ID and QR code.")}</p>
          <div className="organ-grid">
            {PLEDGE_ORGANS.map((organ) => (
              <label key={organ} className={`organ-option${organs.includes(organ) ? " on" : ""}`}>
                <input type="checkbox" checked={organs.includes(organ)} onChange={() => toggle(organ)} />
                {t(organ)}
              </label>
            ))}
          </div>
          <label className="organ-family">
            <input type="checkbox" checked={familyInformed} onChange={(e) => setFamilyInformed(e.target.checked)} />
            {t("I have told my family about this decision")}
          </label>
          <div className="organ-actions">
            <button className="portal-btn primary small" disabled={busy || organs.length === 0} onClick={() => save(true)}>
              <HeartHandshake size={14} /> {busy ? t("Saving…") : t("Make my pledge")}
            </button>
            {editing && (
              <button className="portal-btn ghost small" onClick={() => setEditing(false)}>
                {t("Cancel")}
              </button>
            )}
          </div>
        </>
      )}
      <a className="organ-official" href="https://notto.mohfw.gov.in/" target="_blank" rel="noopener noreferrer">
        <ExternalLink size={12} /> {t("Also register officially with NOTTO (Government of India)")}
      </a>
    </div>
  );
}

export default OrganPledge;
