import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Hospital, Droplet, Bot, FileHeart, Siren, ShieldCheck, Map, ClipboardList,
  BedDouble, Ambulance, Truck, Package, Clock, Inbox, Users,
} from "lucide-react";
import api from "../services/api";
import { getUser } from "../services/auth";
import { roleLabel } from "../services/admin";
import AppNavbar from "./AppNavbar";
import "./Dashboard.css";
import "./portal.css";

/*
 * Cards per role. `path` marks a feature that is actually built; the rest render
 * as "Coming soon" so the dashboard shows the full plan without pretending.
 */
const FEATURES = {
  civilian: [
    { icon: FileHeart, title: "Health Records", desc: "Your medical reports, vitals and documents in one place.", path: "/health-records" },
    { icon: User, title: "My Profile", desc: "Blood group, medical history, allergies, and emergency contacts.", path: "/profile" },
    { icon: Hospital, title: "Find Hospitals", desc: "Search nearby hospitals with bed and ambulance availability.", path: "/find-hospitals" },
    { icon: ShieldCheck, title: "Role & Account", desc: "Request a hospital, police, fire station or pharmacy account.", path: "/settings/role" },
    { icon: Droplet, title: "Blood Donation", desc: "Find or offer blood donations by blood group, nearby." },
    { icon: Bot, title: "AI First-Aid Assistant", desc: "Get quick first-aid guidance while help is on the way. Open it from the chat button in the bottom-right corner.", note: "Live now" },
  ],
  police: [
    { icon: Siren, title: "Incoming Alerts", desc: "Live SOS alerts raised in your coverage area.", path: "/police/alerts" },
    { icon: Map, title: "Coverage Map", desc: "See active incidents plotted across your jurisdiction." },
    { icon: ClipboardList, title: "Incident Reports", desc: "File and review reports for responded incidents.", path: "/police/alerts" },
  ],
  hospital: [
    { icon: Users, title: "Patient Records", desc: "Look up a patient by phone and file medical reports.", path: "/hospital/patients" },
    { icon: Ambulance, title: "Incoming Patients", desc: "Patients heading your way from SOS alerts.", path: "/hospital/incoming" },
    { icon: BedDouble, title: "Bed Availability", desc: "Keep your bed and ambulance counts up to date.", path: "/hospital/beds" },
  ],
  firestation: [
    { icon: Siren, title: "Active Calls", desc: "Fire and rescue calls assigned to your station.", path: "/firestation/alerts" },
    { icon: Truck, title: "Fleet Status", desc: "Track which engines and crews are available.", path: "/firestation/alerts" },
    { icon: Map, title: "Coverage Map", desc: "Live view of incidents across your coverage area." },
  ],
  pharmacy: [
    { icon: Package, title: "Stock Status", desc: "Publish which critical medicines you have in stock.", path: "/pharmacy/stock" },
    { icon: Clock, title: "Hours & Availability", desc: "Let people know when you are open.", path: "/pharmacy/stock" },
    { icon: Inbox, title: "Requests", desc: "Incoming medicine requests from nearby users.", path: "/pharmacy/stock" },
  ],
  admin: [
    { icon: ShieldCheck, title: "Admin Console", desc: "Approve or reject organisation account requests.", path: "/admin" },
    { icon: Users, title: "All Accounts", desc: "Browse every account registered on LifeLink.", path: "/admin" },
  ],
};

const normaliseRole = (role) => (role === "citizen" || !role ? "civilian" : role);

function Dashboard() {
  const navigate = useNavigate();
  const user = getUser() || {};
  const role = normaliseRole(user.role);
  const status = user.roleStatus || "approved";

  const [sosLoading, setSosLoading] = useState(false);
  const [sosResult, setSosResult] = useState(null);
  const [sosError, setSosError] = useState("");

  const handleSOS = () => {
    setSosError("");
    setSosResult(null);

    if (!navigator.geolocation) {
      setSosError("Location is not supported on this device/browser.");
      return;
    }

    setSosLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await api.post("/sos", { latitude, longitude, type: "medical" });
          setSosResult(res.data);
        } catch (err) {
          setSosError(err.response?.data?.message || "Failed to send SOS. Please try again.");
        } finally {
          setSosLoading(false);
        }
      },
      () => {
        setSosError("Location access denied. Please allow location to use SOS.");
        setSosLoading(false);
      }
    );
  };

  const cards = FEATURES[role] || FEATURES.civilian;
  const isPending = status === "pending";
  const isRejected = status === "rejected";

  return (
    <div className="dash-wrapper">
      <AppNavbar showLogout />

      <div className="dash-content">
        <div className="dash-welcome">
          <h1>Welcome back, {user.name || "there"}</h1>
          <p>
            {user.orgName ? `${user.orgName} · ` : ""}
            {roleLabel(user.role)} account
          </p>
        </div>

        {isPending && (
          <div className="portal-message error" style={{ marginBottom: 24 }}>
            Your {roleLabel(user.role).toLowerCase()} account is waiting for admin approval. You
            will get access to these features once it is approved.
          </div>
        )}

        {isRejected && (
          <div className="portal-message error" style={{ marginBottom: 24 }}>
            Your organisation request was rejected.{" "}
            <button className="portal-back" style={{ margin: 0 }} onClick={() => navigate("/settings/role")}>
              Request a different role
            </button>
          </div>
        )}

        {role === "civilian" && (
          <div className="sos-card">
            <div className="sos-text">
              <h2>In an emergency?</h2>
              <p>Press the button to instantly alert the nearest hospital with your live location.</p>
              {sosResult && (
                <div className="sos-status success">
                  SOS sent — nearest hospital:{" "}
                  {sosResult.nearestHospital?.name || "none found within 10km, but your alert was recorded"}
                </div>
              )}
              {sosError && <div className="sos-status error">{sosError}</div>}
            </div>
            <button className="sos-button" onClick={handleSOS} disabled={sosLoading}>
              <Siren size={22} />
              {sosLoading ? "Sending" : "SOS"}
            </button>
          </div>
        )}

        <div className="dash-grid">
          {cards.map(({ icon: Icon, title, desc, path, note }) => {
            const locked = Boolean(path) && (isPending || isRejected);
            const clickable = Boolean(path) && !locked;

            return (
              <div
                className="dash-card"
                key={title}
                style={clickable ? { cursor: "pointer" } : undefined}
                onClick={clickable ? () => navigate(path) : undefined}
              >
                <div className="icon-circle">
                  <Icon size={19} />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
                {!path && !note && <span className="badge-soon">Coming soon</span>}
                {note && <span className="badge-live">{note}</span>}
                {locked && <span className="badge-soon">Awaiting approval</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
