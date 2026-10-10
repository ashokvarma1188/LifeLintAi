import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Droplet, Phone, AlertCircle, HeartPulse, HeartHandshake } from "lucide-react";
import { getPublicMedicalId } from "../services/publicLinks";
import "./Dashboard.css";
import "./portal.css";
import { useLang } from "../i18n/context";
import LanguageSwitcher from "../components/LanguageSwitcher";

/** What a responder sees after scanning a person's Medical ID QR code — only what's needed in an emergency. */
function PublicMedicalId() {
  const { token } = useParams();
  const { t } = useLang();
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setCard(await getPublicMedicalId(token));
      } catch (err) {
        setError(
          err.response?.status === 404
            ? t("This Medical ID is not available. The owner may have switched it off.")
            : t("Could not load the Medical ID.")
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="portal-page">
      <div className="portal-content" style={{ maxWidth: 640 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <LanguageSwitcher />
        </div>
        <div className="portal-head">
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HeartPulse size={20} color="#d0021b" /> {t("Emergency Medical ID")}
            </h1>
            <p>{t("Shared by the owner for use in an emergency.")}</p>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}

        {card && (
          <div className="portal-panel">
            <h2 style={{ margin: "0 0 2px" }}>{card.name}</h2>
            {card.age && <p style={{ margin: "0 0 14px", color: "var(--text-secondary)" }}>{t("{age} years", { age: card.age })}</p>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{t("Blood group")}</div>
                <div style={{ fontSize: 26, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                  <Droplet size={20} color="#d0021b" /> {card.bloodGroup || t("Not set")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{t("Allergies")}</div>
                {card.allergies.length ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {card.allergies.map((a) => (
                      <span key={a} className="portal-badge rejected">
                        <AlertCircle size={11} /> {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  t("None listed")
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{t("Medical conditions")}</div>
                {card.medicalHistory.length ? card.medicalHistory.join(", ") : t("None listed")}
              </div>
            </div>

            {card.organDonor?.length > 0 && (
              <div className="portal-message success" style={{ margin: "18px 0 0", display: "flex", gap: 8, alignItems: "center" }}>
                <HeartHandshake size={16} />
                <span>
                  <strong>{t("Registered organ donor")}</strong> — {card.organDonor.map((o) => t(o)).join(", ")}
                </span>
              </div>
            )}

            <h3 style={{ fontSize: 14.5, margin: "20px 0 8px" }}>{t("Call an emergency contact")}</h3>
            {card.emergencyContacts.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {card.emergencyContacts.map((c, i) => (
                  <a key={i} className="portal-btn primary" href={`tel:${c.phone}`} style={{ justifyContent: "flex-start", textDecoration: "none" }}>
                    <Phone size={14} /> {c.name || t("Contact")}
                    {c.relation ? ` (${c.relation})` : ""} — {c.phone}
                  </a>
                ))}
              </div>
            ) : (
              t("No emergency contacts saved.")
            )}

            <a className="portal-btn ghost" href="tel:112" style={{ marginTop: 16, textDecoration: "none" }}>
              <Phone size={14} /> {t("Call emergency services (112)")}
            </a>
          </div>
        )}

        <p style={{ marginTop: 18, fontSize: 12.5 }}>
          <Link to="/">LifeLink AI</Link>
        </p>
      </div>
    </div>
  );
}

export default PublicMedicalId;
