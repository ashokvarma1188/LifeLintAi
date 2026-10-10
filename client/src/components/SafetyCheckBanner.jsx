import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleCheck, LifeBuoy, MapPinOff, MessageCircle } from "lucide-react";
import { listActiveChecks, respondToCheck } from "../services/safetyChecks";
import { getErrorMessage } from "../services/api";
import { whatsappLink } from "../utils/share";
import { useLang } from "../i18n/context";
import "./SafetyCheckBanner.css";

const KIND_ICON = { flood: "🌊", cyclone: "🌀", fire: "🔥", earthquake: "🌍", heatwave: "🌡️", other: "⚠️" };
const KIND_LABEL = { flood: "Flood", cyclone: "Cyclone", fire: "Fire", earthquake: "Earthquake", heatwave: "Heatwave", other: "Emergency" };

const currentPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });

/** Dashboard banner for an admin-declared disaster area: "Are you safe?". */
function SafetyCheckBanner({ contacts = [], userName }) {
  const { t } = useLang();
  const [checks, setChecks] = useState([]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listActiveChecks()
      .then((list) => !cancelled && setChecks(list))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const answer = async (check, status) => {
    setBusy(`${check._id}:${status}`);
    setError("");
    try {
      // Location is required to send help, and helps the admin's map for "safe" too.
      const position = await currentPosition();
      if (status === "need_help" && !position) {
        setError("Allow location so responders can find you, then try again.");
        return;
      }
      await respondToCheck(check._id, { status, ...(position || {}) });
      setChecks((list) => list.map((c) => (c._id === check._id ? { ...c, myResponse: status } : c)));
      setEditing(null);
    } catch (err) {
      setError(getErrorMessage(err, "Could not send your answer. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  if (checks.length === 0) return null;

  return (
    <div className="sc-stack">
      {checks.map((check) => {
        const answered = check.myResponse && editing !== check._id;
        const safeText = t("✅ I'm safe. I marked myself safe in the LifeLink Safety Check for \"{title}\". — {name}", {
          title: check.title,
          name: userName || "",
        });

        if (answered) {
          return (
            <div key={check._id} className={`sc-banner compact ${check.myResponse}`}>
              <span className="sc-kind">{KIND_ICON[check.kind]}</span>
              <div className="sc-text">
                <strong>{check.title}</strong>
                <span>
                  {check.myResponse === "safe" && t("You marked yourself safe.")}
                  {check.myResponse === "not_in_area" && t("You said you're not in this area.")}
                  {check.myResponse === "need_help" && (
                    <>
                      {t("Help has been requested. Police and fire services have your location.")}{" "}
                      <Link to="/sos-history">{t("See your SOS")}</Link>
                    </>
                  )}
                </span>
              </div>
              {check.myResponse === "safe" && (
                <div className="sc-family">
                  {(contacts.length ? contacts.slice(0, 3) : [{ name: t("Share"), phone: "" }]).map((c) => (
                    <a key={`${c.name}-${c.phone}`} className="portal-btn ghost small" href={whatsappLink(c.phone, safeText)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={13} /> {contacts.length ? t("Tell {name}", { name: c.name }) : t("Tell my family")}
                    </a>
                  ))}
                </div>
              )}
              {check.myResponse !== "need_help" && (
                <button className="portal-back sc-change" onClick={() => setEditing(check._id)}>{t("Change")}</button>
              )}
            </div>
          );
        }

        return (
          <div key={check._id} className="sc-banner">
            <div className="sc-head">
              <span className="sc-kind big">{KIND_ICON[check.kind]}</span>
              <div>
                <span className="sc-eyebrow">{t("Safety Check")} · {t(KIND_LABEL[check.kind])}</span>
                <h2>{check.title}</h2>
                {check.message && <p>{check.message}</p>}
                <p className="sc-area">{t("Affected area: about {km} km around the marked place.", { km: check.radiusKm })}</p>
              </div>
            </div>
            <p className="sc-question">{t("Are you safe?")}</p>
            <div className="sc-actions">
              <button className="sc-btn safe" onClick={() => answer(check, "safe")} disabled={Boolean(busy)}>
                <CircleCheck size={18} /> {busy === `${check._id}:safe` ? t("Sending…") : t("I'm safe")}
              </button>
              <button className="sc-btn help" onClick={() => answer(check, "need_help")} disabled={Boolean(busy)}>
                <LifeBuoy size={18} /> {busy === `${check._id}:need_help` ? t("Sending…") : t("I need help")}
              </button>
              <button className="sc-btn away" onClick={() => answer(check, "not_in_area")} disabled={Boolean(busy)}>
                <MapPinOff size={18} /> {t("I'm not in this area")}
              </button>
            </div>
            <p className="sc-hint">{t("\"I need help\" sends an SOS with your location to the police and fire services.")}</p>
            {error && <div className="portal-message error" style={{ margin: "12px 0 0" }}>{t(error)}</div>}
          </div>
        );
      })}
    </div>
  );
}

export default SafetyCheckBanner;
