import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Droplet, Phone, AlertCircle, HeartPulse } from "lucide-react";
import { getPublicMedicalId } from "../services/publicLinks";
import "./Dashboard.css";
import "./portal.css";

/** What a responder sees after scanning a person's Medical ID QR code — only what's needed in an emergency. */
function PublicMedicalId() {
  const { token } = useParams();
  const [card, setCard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setCard(await getPublicMedicalId(token));
      } catch (err) {
        setError(
          err.response?.status === 404
            ? "This Medical ID is not available. The owner may have switched it off."
            : "Could not load the Medical ID."
        );
      }
    })();
  }, [token]);

  return (
    <div className="portal-page">
      <div className="portal-content" style={{ maxWidth: 640 }}>
        <div className="portal-head">
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HeartPulse size={20} color="#d0021b" /> Emergency Medical ID
            </h1>
            <p>Shared by the owner for use in an emergency.</p>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}

        {card && (
          <div className="portal-panel">
            <h2 style={{ margin: "0 0 2px" }}>{card.name}</h2>
            {card.age && <p style={{ margin: "0 0 14px", color: "var(--text-secondary)" }}>{card.age} years</p>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Blood group</div>
                <div style={{ fontSize: 26, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                  <Droplet size={20} color="#d0021b" /> {card.bloodGroup || "Not set"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Allergies</div>
                {card.allergies.length ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {card.allergies.map((a) => (
                      <span key={a} className="portal-badge rejected">
                        <AlertCircle size={11} /> {a}
                      </span>
                    ))}
                  </div>
                ) : (
                  "None listed"
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Medical conditions</div>
                {card.medicalHistory.length ? card.medicalHistory.join(", ") : "None listed"}
              </div>
            </div>

            <h3 style={{ fontSize: 14.5, margin: "20px 0 8px" }}>Call an emergency contact</h3>
            {card.emergencyContacts.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {card.emergencyContacts.map((c, i) => (
                  <a key={i} className="portal-btn primary" href={`tel:${c.phone}`} style={{ justifyContent: "flex-start", textDecoration: "none" }}>
                    <Phone size={14} /> {c.name || "Contact"}
                    {c.relation ? ` (${c.relation})` : ""} — {c.phone}
                  </a>
                ))}
              </div>
            ) : (
              "No emergency contacts saved."
            )}

            <a className="portal-btn ghost" href="tel:112" style={{ marginTop: 16, textDecoration: "none" }}>
              <Phone size={14} /> Call emergency services (112)
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
