import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Hospital, Droplet, Bot, FileHeart, Siren, ShieldCheck, Map, ClipboardList,
  BedDouble, Ambulance, Truck, Package, Clock, Inbox, Users, History, HeartPulse, Building2,
} from "lucide-react";
import api, { getErrorMessage } from "../services/api";
import { getUser, resendVerification } from "../services/auth";
import { roleLabel, refreshCurrentUser } from "../services/admin";
import { listActiveAnnouncements } from "../services/announcements";
import AppNavbar from "./AppNavbar";
import "./Dashboard.css";
import "./portal.css";

/*
 * Cards per role. `path` marks a feature that is actually built; the rest render
 * as "Coming soon" so the dashboard shows the full plan without pretending.
 */
const FEATURES = {
  civilian: [
    { icon: History, title: "SOS History", desc: "Every alert you've sent, with live status and the option to cancel.", path: "/sos-history" },
    { icon: FileHeart, title: "Health Records", desc: "Your medical reports, vitals and documents in one place.", path: "/health-records" },
    { icon: HeartPulse, title: "Medical ID", desc: "Emergency-ready summary, vitals trends, and who's viewed your records.", path: "/medical-id" },
    { icon: User, title: "My Profile", desc: "Blood group, medical history, allergies, and emergency contacts.", path: "/profile" },
    { icon: Hospital, title: "Find Hospitals", desc: "Search nearby hospitals with bed and ambulance availability.", path: "/find-hospitals" },
    { icon: ShieldCheck, title: "Role & Account", desc: "Request a hospital, police, fire station or pharmacy account.", path: "/settings/role" },
    { icon: Droplet, title: "Blood Donation", desc: "Find or offer blood donations by blood group, nearby.", path: "/blood-donation" },
    { icon: Package, title: "Find Pharmacies", desc: "Check medicine stock nearby and request what you need.", path: "/find-pharmacies" },
    { icon: Bot, title: "AI First-Aid Assistant", desc: "Get quick first-aid guidance while help is on the way. Open it from the chat button in the bottom-right corner.", note: "Live now" },
  ],
  police: [
    { icon: Siren, title: "Incoming Alerts", desc: "Live SOS alerts raised in your coverage area.", path: "/police/alerts", tab: "alerts" },
    { icon: Map, title: "Coverage Map", desc: "See active incidents plotted across your jurisdiction.", path: "/police/alerts", tab: "map" },
    { icon: ClipboardList, title: "Incident Reports", desc: "File and review reports for responded incidents.", path: "/police/alerts", tab: "reports" },
    { icon: Building2, title: "Organisation Profile", desc: "Logo, hours, service radius, and staff accounts.", path: "/org-profile" },
  ],
  hospital: [
    { icon: Users, title: "Patient Records", desc: "Look up a patient by phone and file medical reports.", path: "/hospital/patients" },
    { icon: Ambulance, title: "Incoming Patients", desc: "Patients heading your way from SOS alerts.", path: "/hospital/incoming" },
    { icon: BedDouble, title: "Bed Availability", desc: "Keep your bed and ambulance counts up to date.", path: "/hospital/beds" },
    { icon: Building2, title: "Organisation Profile", desc: "Logo, hours, service radius, and staff accounts.", path: "/org-profile" },
  ],
  firestation: [
    { icon: Siren, title: "Active Calls", desc: "Fire and rescue calls assigned to your station.", path: "/firestation/alerts", tab: "alerts" },
    { icon: Truck, title: "Fleet Status", desc: "Track which engines and crews are available.", path: "/firestation/alerts", tab: "fleet" },
    { icon: Map, title: "Coverage Map", desc: "Live view of incidents across your coverage area.", path: "/firestation/alerts", tab: "map" },
    { icon: Building2, title: "Organisation Profile", desc: "Logo, hours, service radius, and staff accounts.", path: "/org-profile" },
  ],
  pharmacy: [
    { icon: Package, title: "Stock Status", desc: "Publish which critical medicines you have in stock.", path: "/pharmacy/stock", tab: "stock" },
    { icon: Clock, title: "Hours & Availability", desc: "Let people know when you are open.", path: "/pharmacy/stock", tab: "stock" },
    { icon: Inbox, title: "Requests", desc: "Incoming medicine requests from nearby users.", path: "/pharmacy/stock", tab: "requests" },
    { icon: Building2, title: "Organisation Profile", desc: "Logo, service radius, and staff accounts.", path: "/org-profile" },
  ],
  admin: [
    { icon: ShieldCheck, title: "Admin Console", desc: "Approve or reject organisation account requests.", path: "/admin" },
    { icon: Users, title: "All Accounts", desc: "Browse every account registered on LifeLink.", path: "/admin" },
  ],
};

const normaliseRole = (role) => (role === "citizen" || !role ? "civilian" : role);

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getUser() || {});
  const role = normaliseRole(user.role);
  const status = user.roleStatus || "approved";

  const [sosLoading, setSosLoading] = useState(false);
  const [sosResult, setSosResult] = useState(null);
  const [sosError, setSosError] = useState("");
  const [sosTargets, setSosTargets] = useState(["hospital", "police", "firestation"]);
  const [verifySending, setVerifySending] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState("");
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    (async () => {
      const data = await listActiveAnnouncements().catch(() => []);
      setAnnouncements(data);
    })();
    // Pick up an admin's approve/reject/reactivate decision without needing a
    // fresh login — the cached user in localStorage otherwise only updates
    // inside RoleSettings' own submit handler or at next login.
    (async () => {
      const fresh = await refreshCurrentUser().catch(() => null);
      if (fresh) setUser(fresh);
    })();
  }, []);

  const handleResendVerification = async () => {
    setVerifySending(true);
    setVerifyNotice("");
    try {
      const data = await resendVerification();
      setVerifyNotice(data.verifyUrl ? `Verification link: ${data.verifyUrl}` : "Verification email sent — check your inbox.");
    } catch (err) {
      setVerifyNotice(getErrorMessage(err, "Could not send verification email."));
    } finally {
      setVerifySending(false);
    }
  };

  const toggleTarget = (target) => {
    setSosTargets((prev) =>
      prev.includes(target) ? prev.filter((t) => t !== target) : [...prev, target]
    );
  };

  const handleSOS = () => {
    setSosError("");
    setSosResult(null);

    if (sosTargets.length === 0) {
      setSosError("Choose at least one service to alert.");
      return;
    }

    if (!navigator.geolocation) {
      setSosError("Location is not supported on this device/browser.");
      return;
    }

    setSosLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await api.post("/sos", { latitude, longitude, type: "medical", targets: sosTargets });
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

        {announcements.map((a) => (
          <div key={a._id} className="portal-message success" style={{ marginBottom: 16 }}>
            📢 {a.message}
          </div>
        ))}

        {(isPending || isRejected) && (
          <div className="portal-panel" style={{ marginBottom: 24 }}>
            <div className="portal-message error" style={{ marginBottom: 16 }}>
              {isPending
                ? `Your ${roleLabel(user.role).toLowerCase()} account is waiting for admin approval. You'll get access to these features once it's approved — check back here any time.`
                : "Your organisation request was rejected."}
            </div>
            <button className="portal-btn primary" onClick={() => navigate("/settings/role")}>
              {isPending ? "View request / switch to a different role" : "Request a different role"}
            </button>
          </div>
        )}

        {!user.emailVerified && (
          <div className="portal-message error" style={{ marginBottom: 24 }}>
            Please verify your email address.{" "}
            <button className="portal-back" style={{ margin: 0 }} onClick={handleResendVerification} disabled={verifySending}>
              {verifySending ? "Sending…" : "Resend verification email"}
            </button>
            {verifyNotice && <div style={{ marginTop: 8, wordBreak: "break-all" }}>{verifyNotice}</div>}
          </div>
        )}

        {role === "civilian" && (
          <div className="sos-card">
            <div className="sos-text">
              <h2>In an emergency?</h2>
              <p>Choose who to alert, then press the button to send your live location instantly.</p>

              <div className="sos-targets">
                {[
                  { value: "hospital", label: "Hospital" },
                  { value: "police", label: "Police" },
                  { value: "firestation", label: "Fire Station" },
                ].map((t) => (
                  <label key={t.value} className="sos-target-option">
                    <input
                      type="checkbox"
                      checked={sosTargets.includes(t.value)}
                      onChange={() => toggleTarget(t.value)}
                    />
                    {t.label}
                  </label>
                ))}
              </div>

              {sosResult && (
                <div className="sos-status success">
                  SOS sent to {sosTargets.join(", ")}
                  {sosTargets.includes("hospital") &&
                    ` — nearest hospital: ${
                      sosResult.nearestHospital?.name || "none found within 10km, but your alert was recorded"
                    }`}
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

        {!isPending && !isRejected && (
          <div className="dash-grid">
            {cards.map(({ icon: Icon, title, desc, path, note, tab }) => (
              <div
                className="dash-card"
                key={title}
                style={path ? { cursor: "pointer" } : undefined}
                onClick={path ? () => navigate(path, tab ? { state: { tab } } : undefined) : undefined}
              >
                <div className="icon-circle">
                  <Icon size={19} />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
                {!path && !note && <span className="badge-soon">Coming soon</span>}
                {note && <span className="badge-live">{note}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
