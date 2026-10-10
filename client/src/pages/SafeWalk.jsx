import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Footprints, ShieldCheck, Clock, MessageCircle, Smartphone, Copy, Check, AlertTriangle, Plus } from "lucide-react";
import AppNavbar from "./AppNavbar";
import LiveTrackMap from "../components/LiveTrackMap";
import NotificationToggle from "../components/NotificationToggle";
import api, { getErrorMessage } from "../services/api";
import { startWalk, getCurrentWalk, sendWalkLocation, extendWalk, markArrived, cancelWalk } from "../services/safeWalk";
import { getUser } from "../services/auth";
import { walkMessage, walkUrl, whatsappLink, smsLink } from "../utils/share";
import { useLang } from "../i18n/context";
import "./Dashboard.css";
import "./portal.css";
import "./SafeWalk.css";

const DURATIONS = [10, 15, 20, 30, 45, 60, 90];
const LOCATION_EVERY_MS = 20000;

const getPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition((p) => resolve(p.coords), reject, { enableHighAccuracy: true, timeout: 15000 });
  });

const formatLeft = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

/** Share live location for a trip; if you don't check in on time, you're asked — then (optionally) police are alerted. */
function SafeWalk() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [walk, setWalk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ destination: "", minutes: 20, autoSos: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [contacts, setContacts] = useState([]);
  const [copied, setCopied] = useState(false);
  const lastSent = useRef(0);
  const live = walk && ["active", "overdue", "alerted"].includes(walk.status);

  const load = useCallback(async () => {
    try {
      setWalk(await getCurrentWalk());
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your walk."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      const profile = await api.get("/profile/me").then((r) => r.data).catch(() => null);
      if (profile?.emergencyContacts) setContacts(profile.emergencyContacts.filter((c) => c.phone));
    })();
  }, [load]);

  // Countdown clock + pick up server-side changes (overdue / police alerted).
  useEffect(() => {
    if (!live) return undefined;
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const refresh = setInterval(load, 30000);
    return () => {
      clearInterval(clock);
      clearInterval(refresh);
    };
  }, [live, load]);

  // Keep the shared location fresh while the walk runs and this page is open.
  const walkId = live ? walk._id : null;
  useEffect(() => {
    if (!walkId || !navigator.geolocation?.watchPosition) return undefined;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        if (Date.now() - lastSent.current < LOCATION_EVERY_MS) return;
        lastSent.current = Date.now();
        sendWalkLocation(walkId, p.coords.latitude, p.coords.longitude)
          .then(setWalk)
          .catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [walkId]);

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.response ? getErrorMessage(err) : err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const begin = (e) => {
    e.preventDefault();
    run(async () => {
      let coords;
      try {
        coords = await getPosition();
      } catch {
        throw new Error("Location access is needed to start a walk. Allow location and try again.");
      }
      setWalk(await startWalk({ ...form, latitude: coords.latitude, longitude: coords.longitude }));
      setNow(Date.now());
    });
  };

  const message = walk ? walkMessage(getUser()?.name, walk.destination, walk.shareToken, t) : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(walkUrl(walk.shareToken));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const left = walk ? new Date(walk.expectedArrival).getTime() - now : 0;

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> {t("Back to dashboard")}
        </button>

        <div className="portal-head">
          <div>
            <h1>{t("Walk with me")}</h1>
            <p>{t("Share your live location for a trip. If you don't check in on time, LifeLink asks if you're safe — and can alert the police.")}</p>
          </div>
        </div>

        <NotificationToggle role="civilian" />
        {error && <div className="portal-message error">{t(error)}</div>}

        {loading ? null : !live ? (
          <div className="portal-panel">
            {walk?.status === "arrived" && <div className="portal-message success">{t("You arrived safely. Walk ended.")}</div>}
            <form className="portal-form" onSubmit={begin}>
              <div className="portal-field">
                <label htmlFor="walkDest">{t("Where are you going? (optional)")}</label>
                <input
                  id="walkDest"
                  value={form.destination}
                  maxLength={120}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  placeholder={t("e.g. Home, hostel, bus stand")}
                />
              </div>
              <div className="portal-field">
                <label>{t("I should arrive in")}</label>
                <div className="walk-durations">
                  {DURATIONS.map((m) => (
                    <button
                      type="button"
                      key={m}
                      className={`portal-btn small ${form.minutes === m ? "primary" : "ghost"}`}
                      onClick={() => setForm({ ...form, minutes: m })}
                    >
                      {t("{n} min", { n: m })}
                    </button>
                  ))}
                </div>
              </div>
              <label className="walk-check">
                <input type="checkbox" checked={form.autoSos} onChange={(e) => setForm({ ...form, autoSos: e.target.checked })} />
                {t("If I don't check in 5 minutes after the time, send an SOS to the police with my last location")}
              </label>
              <div className="portal-form-actions">
                <button type="submit" className="portal-btn primary" disabled={busy}>
                  <Footprints size={16} /> {busy ? t("Starting…") : t("Start walk")}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className={`walk-status ${walk.status}`}>
              {walk.status === "active" && (
                <>
                  <Clock size={22} />
                  <div>
                    <span className="walk-left">{formatLeft(left)}</span>
                    <span>{walk.destination ? t("left to reach {place}", { place: walk.destination }) : t("left to arrive")}</span>
                  </div>
                </>
              )}
              {walk.status === "overdue" && (
                <>
                  <AlertTriangle size={22} />
                  <div>
                    <strong>{t("You're past your arrival time.")}</strong>
                    <span>
                      {walk.autoSos
                        ? t("Tap \"I've arrived safely\" now — otherwise the police will be alerted in a few minutes.")
                        : t("Tap \"I've arrived safely\" to end the walk.")}
                    </span>
                  </div>
                </>
              )}
              {walk.status === "alerted" && (
                <>
                  <AlertTriangle size={22} />
                  <div>
                    <strong>{t("Police have been alerted.")}</strong>
                    <span>{t("You didn't check in, so an SOS with your last location was sent. Track it in SOS History.")}</span>
                  </div>
                </>
              )}
            </div>

            <div className="walk-actions">
              <button className="portal-btn primary" disabled={busy} onClick={() => run(async () => setWalk(await markArrived(walk._id)))}>
                <ShieldCheck size={16} /> {t("I've arrived safely")}
              </button>
              {walk.status !== "alerted" && (
                <button className="portal-btn ghost" disabled={busy} onClick={() => run(async () => setWalk(await extendWalk(walk._id, 10)))}>
                  <Plus size={15} /> {t("Add 10 minutes")}
                </button>
              )}
              {walk.status === "alerted" ? (
                <button className="portal-btn ghost" onClick={() => navigate("/sos-history")}>
                  {t("Open SOS History")}
                </button>
              ) : (
                <button className="portal-btn ghost" disabled={busy} onClick={() => run(async () => setWalk(await cancelWalk(walk._id)))}>
                  {t("Stop walk")}
                </button>
              )}
            </div>

            <div className="portal-panel" style={{ marginBottom: 16 }}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>{t("Let family follow you")}</h3>
              {contacts.length === 0 ? (
                <p className="walk-hint">{t("Add emergency contacts in My Profile to send them the link in one tap.")}</p>
              ) : (
                <div className="walk-contacts">
                  {contacts.map((c, i) => (
                    <div key={i} className="walk-contact">
                      <span>
                        {c.name || c.phone}
                        {c.relation ? ` (${c.relation})` : ""}
                      </span>
                      <a className="portal-btn ghost small" href={whatsappLink(c.phone, message)} target="_blank" rel="noopener noreferrer">
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                      <a className="portal-btn ghost small" href={smsLink(c.phone, message)}>
                        <Smartphone size={13} /> SMS
                      </a>
                    </div>
                  ))}
                </div>
              )}
              <button className="portal-btn ghost small" style={{ marginTop: 10 }} onClick={copyLink}>
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? t("Link copied") : t("Copy live link")}
              </button>
            </div>

            {walk.lastLocation?.coordinates?.length === 2 && (
              <LiveTrackMap you={walk.lastLocation.coordinates} youLabel={t("You")} />
            )}
            <p className="walk-hint">{t("Keep this page open — your location updates every 20 seconds.")}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default SafeWalk;
