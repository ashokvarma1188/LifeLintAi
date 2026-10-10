import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Hospital, Droplet, Bot, FileHeart, BookHeart, Siren, ShieldCheck, Map, ClipboardList,
  BedDouble, Ambulance, Truck, Package, Clock, Pill, Inbox, Users, History, HeartPulse, Building2, Phone, BarChart3, Megaphone,
} from "lucide-react";
import api, { getErrorMessage } from "../services/api";
import { getUser, resendVerification } from "../services/auth";
import { roleLabel, refreshCurrentUser } from "../services/admin";
import { listActiveAnnouncements } from "../services/announcements";
import { getReminders } from "../services/healthRecords";
import AppNavbar from "./AppNavbar";
import VoiceSos from "../components/VoiceSos";
import SosFollowUp from "../components/SosFollowUp";
import { DonateAgainBanner } from "../components/DonationCard";
import NotificationToggle from "../components/NotificationToggle";
import { syncPushSubscription } from "../services/push";
import "./Dashboard.css";
import "./portal.css";
import { useLang } from "../i18n/context";

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
    { icon: Map, title: "Nearby Police & Fire", desc: "Find registered police and fire stations near you.", path: "/find-emergency-services" },
    { icon: Phone, title: "Emergency Numbers", desc: "Quick-dial reference for Police, Ambulance, Fire and more.", path: "/emergency-numbers" },
    { icon: Pill, title: "Medicine Reminders", desc: "Add your medicines and times — get a reminder at every dose and tick it off.", path: "/medicines" },
    { icon: BookHeart, title: "First-Aid Guide", desc: "Step-by-step help for CPR, choking, bleeding, burns and more — works offline.", path: "/first-aid" },
    { icon: Inbox, title: "Support", desc: "Raise a ticket and get help from the admin team.", path: "/support" },
    { icon: Bot, title: "AI First-Aid Assistant", desc: "Get quick first-aid guidance while help is on the way. Open it from the chat button in the bottom-right corner.", note: "Live now" },
  ],
  police: [
    { icon: Siren, title: "Incoming Alerts", desc: "Live SOS alerts raised in your coverage area.", path: "/police/alerts", tab: "alerts" },
    { icon: Map, title: "Coverage Map", desc: "See active incidents plotted across your jurisdiction.", path: "/police/alerts", tab: "map" },
    { icon: ClipboardList, title: "Incident Reports", desc: "File and review reports for responded incidents.", path: "/police/alerts", tab: "reports" },
    { icon: BarChart3, title: "Analytics", desc: "Response times, acceptance rate and false-alarm rate.", path: "/police/alerts", tab: "analytics" },
    { icon: Building2, title: "Organisation Profile", desc: "Logo, hours, service radius, and staff accounts.", path: "/org-profile" },
  ],
  hospital: [
    { icon: Users, title: "Patient Records", desc: "Look up a patient by phone and file medical reports.", path: "/hospital/patients" },
    { icon: Ambulance, title: "Incoming Patients", desc: "Patients heading your way from SOS alerts.", path: "/hospital/incoming" },
    { icon: BedDouble, title: "Bed Availability", desc: "Keep your bed, ICU and ambulance counts up to date.", path: "/hospital/beds" },
    { icon: Droplet, title: "Blood Requests", desc: "Request blood for a patient — matched to compatible donors nearby.", path: "/blood-donation" },
    { icon: Building2, title: "Organisation Profile", desc: "Logo, hours, service radius, and staff accounts.", path: "/org-profile" },
  ],
  firestation: [
    { icon: Siren, title: "Active Calls", desc: "Fire and rescue calls assigned to your station.", path: "/firestation/alerts", tab: "alerts" },
    { icon: Truck, title: "Fleet Status", desc: "Track which engines and crews are available.", path: "/firestation/alerts", tab: "fleet" },
    { icon: Map, title: "Coverage Map", desc: "Live view of incidents across your coverage area.", path: "/firestation/alerts", tab: "map" },
    { icon: ClipboardList, title: "Incident Reports", desc: "File and review reports for responded calls.", path: "/firestation/alerts", tab: "reports" },
    { icon: BarChart3, title: "Analytics", desc: "Response times, acceptance rate and false-alarm rate.", path: "/firestation/alerts", tab: "analytics" },
    { icon: Building2, title: "Organisation Profile", desc: "Logo, hours, service radius, and staff accounts.", path: "/org-profile" },
  ],
  pharmacy: [
    { icon: Package, title: "Stock Status", desc: "Publish which critical medicines you have in stock.", path: "/pharmacy/stock", tab: "stock" },
    { icon: Clock, title: "Hours & Availability", desc: "Let people know when you are open.", path: "/pharmacy/stock", tab: "stock" },
    { icon: Inbox, title: "Requests", desc: "Incoming medicine requests from nearby users.", path: "/pharmacy/stock", tab: "requests" },
    { icon: Building2, title: "Organisation Profile", desc: "Logo, service radius, and staff accounts.", path: "/org-profile" },
  ],
  admin: [
    { icon: ShieldCheck, title: "Pending Approvals", desc: "Approve or reject organisation account requests.", path: "/admin", tab: "pending" },
    { icon: Users, title: "All Accounts", desc: "Browse, search and manage every account on LifeLink.", path: "/admin", tab: "all" },
    { icon: BarChart3, title: "Analytics", desc: "Platform-wide SOS, response time and user stats.", path: "/admin", tab: "analytics" },
    { icon: ClipboardList, title: "Audit Log", desc: "Hospital access to patient records.", path: "/admin", tab: "audit" },
    { icon: History, title: "Admin Activity", desc: "Who approved, rejected or suspended which account.", path: "/admin", tab: "actionlog" },
    { icon: Megaphone, title: "Announcements", desc: "Post or remove the banner shown to every user.", path: "/admin", tab: "announcements" },
    { icon: Inbox, title: "Support Tickets", desc: "Reply to civilian support requests.", path: "/admin", tab: "support" },
  ],
};

const TARGET_LABEL = { hospital: "Hospital", police: "Police", firestation: "Fire Station" };

const normaliseRole = (role) => (role === "citizen" || !role ? "civilian" : role);

function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [user, setUser] = useState(() => getUser() || {});
  const role = normaliseRole(user.role);
  const status = user.roleStatus || "approved";

  const [sosLoading, setSosLoading] = useState(false);
  const [sosResult, setSosResult] = useState(null);
  const [sosError, setSosError] = useState("");
  const [sosTargets, setSosTargets] = useState(["hospital", "police", "firestation"]);
  const [sosType, setSosType] = useState("medical");
  const [shareMedicalId, setShareMedicalId] = useState(false);
  const [verifySending, setVerifySending] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [contacts, setContacts] = useState([]);
  const locationWatchId = useRef(null);

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
    (async () => {
      const data = await getReminders().catch(() => []);
      setReminders(data);
    })();
    // Keep this device's push subscription linked to whoever is signed in now.
    syncPushSubscription();

    // Family numbers for the one-tap "tell your family" step after an SOS (only civilians have them).
    (async () => {
      const profile = await api.get("/profile/me").then((r) => r.data).catch(() => null);
      if (profile?.emergencyContacts) setContacts(profile.emergencyContacts);
    })();

    // Stop sharing live location if the user navigates away mid-emergency.
    return () => {
      if (locationWatchId.current !== null) navigator.geolocation.clearWatch(locationWatchId.current);
    };
  }, []);

  const handleResendVerification = async () => {
    setVerifySending(true);
    setVerifyNotice("");
    try {
      const data = await resendVerification();
      setVerifyNotice(data.verifyUrl ? `${t("Verification link:")} ${data.verifyUrl}` : t("Verification email sent — check your inbox."));
    } catch (err) {
      setVerifyNotice(getErrorMessage(err, t("Could not send verification email.")));
    } finally {
      setVerifySending(false);
    }
  };

  const toggleTarget = (target) => {
    setSosTargets((prev) =>
      prev.includes(target) ? prev.filter((item) => item !== target) : [...prev, target]
    );
  };

  const handleSOS = (overrideType) => {
    setSosError("");
    setSosResult(null);

    if (sosTargets.length === 0) {
      setSosError(t("Choose at least one service to alert."));
      return;
    }

    if (!navigator.geolocation) {
      setSosError(t("Location is not supported on this device/browser."));
      return;
    }

    setSosLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await api.post("/sos", { latitude, longitude, type: overrideType || sosType, targets: sosTargets, shareMedicalId });
          setSosResult(res.data);
          startLiveLocationSharing(res.data.emergencyRequest._id);
        } catch (err) {
          setSosError(err.response?.data?.message || t("Failed to send SOS. Please try again."));
        } finally {
          setSosLoading(false);
        }
      },
      () => {
        setSosError(t("Location access denied. Please allow location to use SOS."));
        setSosLoading(false);
      }
    );
  };

  /** Keeps responders' map pin current while the alert is active and this tab stays open. */
  const startLiveLocationSharing = (requestId) => {
    if (!navigator.geolocation?.watchPosition) return;
    if (locationWatchId.current !== null) navigator.geolocation.clearWatch(locationWatchId.current);

    locationWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        api
          .patch(`/sos/${requestId}/location`, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          .catch(() => {
            // The alert may have already been resolved/cancelled — stop watching rather than retry forever.
            if (locationWatchId.current !== null) {
              navigator.geolocation.clearWatch(locationWatchId.current);
              locationWatchId.current = null;
            }
          });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
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
          <h1>{user.name ? t("Welcome back, {name}", { name: user.name }) : t("Welcome back")}</h1>
          <p>
            {user.orgName ? `${user.orgName} · ` : ""}
            {t("{role} account", { role: t(roleLabel(user.role)) })}
          </p>
        </div>

        {announcements.map((a) => (
          <div key={a._id} className="portal-message success" style={{ marginBottom: 16 }}>
            📢 {a.message}
          </div>
        ))}

        {reminders.length > 0 && (
          <div className="portal-message error" style={{ marginBottom: 16 }}>
            <strong>{t("Follow-up reminder:")}</strong>{" "}
            {reminders.map((r, i) => (
              <span key={r.id}>
                {i > 0 && ", "}
                &quot;{r.title}&quot; {r.overdue ? t("was due") : t("is due")} {r.followUpDate}
              </span>
            ))}
            {" — "}
            <button className="portal-back" style={{ margin: 0 }} onClick={() => navigate("/health-records")}>
              {t("View Health Records")}
            </button>
          </div>
        )}

        {(isPending || isRejected) && (
          <div className="portal-panel" style={{ marginBottom: 24 }}>
            <div className="portal-message error" style={{ marginBottom: 16 }}>
              {isPending
                ? t("Your {role} account is waiting for admin approval. You'll get access to these features once it's approved — check back here any time.", { role: t(roleLabel(user.role)) })
                : t("Your organisation request was rejected.")}
            </div>
            <button className="portal-btn primary" onClick={() => navigate("/settings/role")}>
              {isPending ? t("View request / switch to a different role") : t("Request a different role")}
            </button>
          </div>
        )}

        {!user.emailVerified && (
          <div className="portal-message error" style={{ marginBottom: 24 }}>
            {t("Please verify your email address.")}{" "}
            <button className="portal-back" style={{ margin: 0 }} onClick={handleResendVerification} disabled={verifySending}>
              {verifySending ? t("Sending…") : t("Resend verification email")}
            </button>
            {verifyNotice && <div style={{ marginTop: 8, wordBreak: "break-all" }}>{verifyNotice}</div>}
          </div>
        )}

        {role === "civilian" && <DonateAgainBanner />}

        {["civilian", "hospital", "police", "firestation"].includes(role) && status === "approved" && <NotificationToggle role={role} />}

        {role === "civilian" && (
          <div className="sos-card">
            <div className="sos-text">
              <h2>{t("In an emergency?")}</h2>
              <p>{t("Choose who to alert, then press the button to send your live location instantly.")}</p>

              <div className="sos-targets">
                {Object.entries(TARGET_LABEL).map(([value, label]) => (
                  <label key={value} className="sos-target-option">
                    <input
                      type="checkbox"
                      checked={sosTargets.includes(value)}
                      onChange={() => toggleTarget(value)}
                    />
                    {t(label)}
                  </label>
                ))}
              </div>

              <label className="sos-target-option" style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                {t("What's happening?")}
                <select value={sosType} onChange={(e) => setSosType(e.target.value)}>
                  <option value="medical">{t("Medical emergency")}</option>
                  <option value="fire">{t("Fire")}</option>
                  <option value="accident">{t("Accident")}</option>
                  <option value="safety">{t("Safety / crime")}</option>
                  <option value="other">{t("Other")}</option>
                </select>
              </label>

              <label className="sos-target-option" style={{ marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={shareMedicalId}
                  onChange={(e) => setShareMedicalId(e.target.checked)}
                />
                {t("Share my Medical ID (blood group, allergies, conditions) with responders")}
              </label>

              <VoiceSos
                disabled={sosLoading}
                onTrigger={(spokenType) => {
                  if (spokenType) setSosType(spokenType);
                  handleSOS(spokenType);
                }}
              />

              {sosResult && (
                <div className="sos-status success">
                  {t("SOS sent to {services}", { services: sosTargets.map((s) => t(TARGET_LABEL[s])).join(", ") })}
                  {sosTargets.includes("hospital") &&
                    ` — ${t("nearest hospital: {name}", {
                      name: sosResult.nearestHospital?.name || t("none registered yet, but your alert was recorded"),
                    })}`}
                </div>
              )}
              {sosResult && (
                <SosFollowUp result={sosResult} contacts={contacts} userName={user.name} type={sosResult.emergencyRequest?.type} />
              )}
              {sosError && <div className="sos-status error">{sosError}</div>}
            </div>
            <button className="sos-button" onClick={() => handleSOS()} disabled={sosLoading}>
              <Siren size={22} />
              {sosLoading ? t("Sending") : "SOS"}
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
                <h3>{t(title)}</h3>
                <p>{t(desc)}</p>
                {!path && !note && <span className="badge-soon">{t("Coming soon")}</span>}
                {note && <span className="badge-live">{t(note)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
