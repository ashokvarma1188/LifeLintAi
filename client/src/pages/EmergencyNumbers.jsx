import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone } from "lucide-react";
import AppNavbar from "./AppNavbar";
import "./Dashboard.css";
import "./portal.css";

const NUMBERS = [
  { label: "National Emergency Number", number: "112" },
  { label: "Police", number: "100" },
  { label: "Ambulance", number: "108" },
  { label: "Fire", number: "101" },
  { label: "Women's Helpline", number: "1091" },
  { label: "Child Helpline", number: "1098" },
  { label: "Disaster Management", number: "108" },
  { label: "Poison Control (AIIMS)", number: "1800-11-6117" },
];

function EmergencyNumbers() {
  const navigate = useNavigate();

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> Back to dashboard
        </button>

        <div className="portal-head">
          <div>
            <h1>Emergency numbers</h1>
            <p>Quick reference for India. Save these on your phone too — don't rely on internet access alone.</p>
          </div>
        </div>

        <div className="portal-panel">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {NUMBERS.map((n) => (
              <a
                key={n.label}
                href={`tel:${n.number}`}
                className="portal-panel"
                style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none", color: "inherit" }}
              >
                <div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{n.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{n.number}</div>
                </div>
                <Phone size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmergencyNumbers;
