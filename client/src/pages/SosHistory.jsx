import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Siren, X, History, Phone, Share2, MessageCircle, Route } from "lucide-react";
import AppNavbar from "./AppNavbar";
import MapsLink from "../components/MapsLink";
import LiveTrackMap from "../components/LiveTrackMap";
import SosChat from "../components/SosChat";
import useRoadRoute from "../hooks/useRoadRoute";
import { distanceKm } from "../utils/maps";
import { sosMessage, trackUrl } from "../utils/share";
import { getUser } from "../services/auth";
import { myRequests, cancelSOS } from "../services/sos";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";
import { SkeletonRows } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { useLang } from "../i18n/context";
import { speechLangFor } from "../i18n/languages";

const STATUS_BADGE = { pending: "pending", accepted: "hospital", en_route: "hospital", resolved: "approved", cancelled: "rejected" };
const TIMELINE_STEPS = ["pending", "accepted", "en_route", "resolved"];
const STEP_LABEL = { pending: "Sent", accepted: "Accepted", en_route: "On the way", resolved: "Resolved" };
const STATUS_TEXT = { pending: "pending", accepted: "accepted", en_route: "en route", resolved: "resolved", cancelled: "cancelled", declined: "declined" };
const TYPE_LABEL = { medical: "Medical", fire: "Fire", accident: "Accident", safety: "Safety", other: "Other" };
const RESPONDER_LABEL = { hospital: "Ambulance", police: "Police", firestation: "Fire engine" };
const AVERAGE_SPEED_KMH = 30; // rough city-traffic speed for the arrival estimate
const POLL_MS = 8000;

const isActive = (r) => r.status === "accepted" || r.status === "en_route";

/** Live "help is coming" card: map with both positions, distance and a rough arrival time. */
function LiveTracking({ request }) {
  const { t } = useLang();
  const you = request.location?.coordinates;
  const responder = request.responderLocation?.coordinates;
  const who = RESPONDER_LABEL[request.respondedByRole] || "Help";
  const name = request.respondedBy?.orgName || request.respondedBy?.name;
  const phone = request.respondedBy?.phone;
  // Real road route + driving time; falls back to the straight-line estimate until it arrives.
  const road = useRoadRoute(responder, you);

  if (!you || !responder) {
    return (
      <div className="portal-message success" style={{ marginTop: 12 }}>
        {name ? t("{who} from {name} has accepted your alert.", { who: t(who), name }) : t("{who} has accepted your alert.", { who: t(who) })}
        {request.etaMinutes ? ` ${t("About {minutes} min away.", { minutes: request.etaMinutes })}` : ""}{" "}
        {t("Their live position will appear here once they start moving.")}
        {phone && (
          <>
            {" "}
            <a href={`tel:${phone}`}><Phone size={12} /> {phone}</a>
          </>
        )}
      </div>
    );
  }

  const straightKm = distanceKm(you[1], you[0], responder[1], responder[0]);
  const km = road ? road.km : straightKm;
  const minutes = road ? road.minutes : Math.max(1, Math.round((straightKm / AVERAGE_SPEED_KMH) * 60));
  const arrived = straightKm < 0.1;

  return (
    <div style={{ marginTop: 12 }}>
      <div className="portal-message success" style={{ margin: 0 }}>
        <strong>{arrived ? t("{who} has arrived", { who: t(who) }) : t("{who} is on the way", { who: t(who) })}</strong>
        {name ? ` — ${name}` : ""}
        {!arrived && ` · ${t("{distance} away · about {minutes} min", { distance: km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`, minutes })}`}
        {!arrived && road && (
          <span className="ltm-road-tag">
            <Route size={11} /> {t("by road")}
          </span>
        )}
        {phone && (
          <>
            {" · "}
            <a href={`tel:${phone}`}><Phone size={12} /> {phone}</a>
          </>
        )}
      </div>
      <LiveTrackMap you={you} responder={responder} responderRole={request.respondedByRole} responderName={name} route={road?.coords} />
    </div>
  );
}
const CANCEL_REASON_LABEL = { safe_now: "I'm safe now", sent_by_mistake: "Sent by mistake", other: "Other" };

function Timeline({ status, cancelReason }) {
  const { t } = useLang();
  if (status === "cancelled") {
    return (
      <div className="portal-badge rejected" style={{ display: "inline-block" }}>
        {t("Cancelled by you")}{cancelReason ? ` — ${t(CANCEL_REASON_LABEL[cancelReason])}` : ""}
      </div>
    );
  }
  const currentIndex = TIMELINE_STEPS.indexOf(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {TIMELINE_STEPS.map((step, i) => (
        <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 11.5,
              padding: "3px 9px",
              borderRadius: 999,
              fontWeight: 600,
              background: i <= currentIndex ? "var(--accent-soft-bg)" : "var(--border-color-soft)",
              color: i <= currentIndex ? "var(--accent)" : "var(--text-secondary)",
            }}
          >
            {t(STEP_LABEL[step])}
          </span>
          {i < TIMELINE_STEPS.length - 1 && (
            <span style={{ width: 14, height: 1, background: i < currentIndex ? "var(--accent)" : "var(--border-color)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function SosHistory() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const [chatFor, setChatFor] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await myRequests();
      setRequests(data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, t("Could not load your SOS history.")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  // While help is on the way, refresh quietly so the responder's marker keeps moving.
  const tracking = requests.some(isActive);
  useEffect(() => {
    if (!tracking) return undefined;
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [tracking, load]);

  /** Send family the public live-tracking link — the phone's share sheet where available, otherwise copy it. */
  const shareLink = async (r) => {
    const text = sosMessage(getUser()?.name, r.type, r.shareToken, t);
    try {
      if (navigator.share) {
        await navigator.share({ title: "LifeLink SOS", text, url: trackUrl(r.shareToken) });
      } else {
        await navigator.clipboard.writeText(text);
        setNotice(t("Tracking link copied — paste it into WhatsApp or SMS for your family."));
      }
    } catch {
      /* the user closed the share sheet, or the clipboard is blocked */
    }
  };

  const doCancel = async (id, reason) => {
    setBusyId(id);
    setCancelingId(null);
    setNotice("");
    setError("");
    try {
      await cancelSOS(id, reason);
      setNotice(t("SOS request cancelled."));
      await load();
    } catch (err) {
      setError(getErrorMessage(err, t("Could not cancel this request.")));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="portal-page">
      <AppNavbar showLogout />
      {chatFor && <SosChat requestId={chatFor} title={t("Chat with responders")} onClose={() => setChatFor(null)} />}

      <div className="portal-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> {t("Back to dashboard")}
        </button>

        <div className="portal-head">
          <div>
            <h1>{t("SOS history")}</h1>
            <p>{t("Every alert you've sent, with its live status.")}</p>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        <div className="portal-panel">
          {loading ? (
            <SkeletonRows rows={3} cols={4} />
          ) : requests.length === 0 ? (
            <EmptyState icon={History} title={t("You haven't sent any SOS alerts yet.")} hint={t("Alerts you send from the dashboard will show up here with live status.")} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {requests.map((r) => (
                <div key={r._id} className="portal-panel" style={{ margin: 0 }}>
                  <div className="portal-head" style={{ marginBottom: 10 }}>
                    <div>
                      <h1 style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                        <Siren size={15} /> {t("{type} SOS", { type: t(TYPE_LABEL[r.type] || "Other") })}
                      </h1>
                      <p>
                        {new Date(r.createdAt).toLocaleString(speechLangFor(lang))}
                        {r.assignedHospitalId?.name ? ` · ${t("Nearest hospital: {name}", { name: r.assignedHospitalId.name })}` : ""}
                      </p>
                    </div>
                    <span className={`portal-badge ${STATUS_BADGE[r.status]}`}>{t(STATUS_TEXT[r.status] || r.status)}</span>
                  </div>

                  <Timeline status={r.status} cancelReason={r.cancelReason} />

                  {isActive(r) && <LiveTracking request={r} />}

                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <MapsLink coordinates={r.location?.coordinates} />
                    {r.status !== "cancelled" && (
                      <button className="portal-btn primary small" onClick={() => setChatFor(r._id)}>
                        <MessageCircle size={13} /> {t("Chat with responders")}
                      </button>
                    )}
                    {r.shareToken && ["pending", "accepted", "en_route"].includes(r.status) && (
                      <button className="portal-btn ghost small" onClick={() => shareLink(r)}>
                        <Share2 size={13} /> {t("Share live link")}
                      </button>
                    )}
                    {r.status === "pending" && cancelingId !== r._id && (
                      <button
                        className="portal-btn danger small"
                        disabled={busyId === r._id}
                        onClick={() => setCancelingId(r._id)}
                      >
                        <X size={13} /> {t("Cancel this alert")}
                      </button>
                    )}
                    {r.status === "pending" && cancelingId === r._id && (
                      <>
                        <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{t("Why?")}</span>
                        <button className="portal-btn ghost small" disabled={busyId === r._id} onClick={() => doCancel(r._id, "safe_now")}>
                          {t("I'm safe now")}
                        </button>
                        <button className="portal-btn ghost small" disabled={busyId === r._id} onClick={() => doCancel(r._id, "sent_by_mistake")}>
                          {t("Sent by mistake")}
                        </button>
                        <button className="portal-btn ghost small" disabled={busyId === r._id} onClick={() => doCancel(r._id, "other")}>
                          {t("Other")}
                        </button>
                        <button className="portal-back" style={{ margin: 0 }} onClick={() => setCancelingId(null)}>
                          {t("Back")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SosHistory;
