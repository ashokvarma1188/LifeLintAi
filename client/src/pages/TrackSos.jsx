import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Siren, Phone } from "lucide-react";
import LiveTrackMap from "../components/LiveTrackMap";
import { getTrack } from "../services/publicLinks";
import { distanceKm } from "../utils/maps";
import "./Dashboard.css";
import "./portal.css";
import { useLang } from "../i18n/context";
import LanguageSwitcher from "../components/LanguageSwitcher";

const POLL_MS = 8000;
const FINAL_STATUSES = ["resolved", "cancelled"];
const AVERAGE_SPEED_KMH = 30;
const RESPONDER_LABEL = { hospital: "Ambulance", police: "Police", firestation: "Fire engine" };
const STATUS_BADGE_TEXT = { pending: "pending", accepted: "accepted", en_route: "en route", resolved: "resolved", cancelled: "cancelled", declined: "declined" };
const STATUS_TEXT = {
  pending: "Waiting for a response team to accept.",
  accepted: "A response team has accepted and is getting ready.",
  en_route: "Help is on the way.",
  resolved: "This emergency has been marked resolved.",
  declined: "The alert is still open and being routed.",
  cancelled: "The alert was cancelled — they have said they are safe.",
};

/** Public page opened from the link a civilian sends to family — no login, nothing sensitive. */
function TrackSos() {
  const { token } = useParams();
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let interval = null;
    const load = async () => {
      try {
        const next = await getTrack(token);
        if (!cancelled) {
          setData(next);
          setError("");
          // Nothing more will change once the alert is over — stop polling.
          if (FINAL_STATUSES.includes(next.status)) clearInterval(interval);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.status === 404 ? t("This tracking link is not valid.") : t("Could not load the status. Retrying…"));
        }
      }
    };
    load();
    interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // `t` only changes with the language; refetching on a language switch isn't needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const who = RESPONDER_LABEL[data?.responderRole] || "Help";
  let eta = null;
  if (data?.location && data?.responderLocation) {
    const km = distanceKm(data.location[1], data.location[0], data.responderLocation[1], data.responderLocation[0]);
    eta = { km, minutes: Math.max(1, Math.round((km / AVERAGE_SPEED_KMH) * 60)) };
  }

  const badge = !data ? "" : data.status === "resolved" ? "approved" : data.status === "cancelled" ? "rejected" : "pending";

  return (
    <div className="portal-page">
      <div className="portal-content" style={{ maxWidth: 760 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <LanguageSwitcher />
        </div>
        <div className="portal-head">
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Siren size={20} color="#d0021b" /> {t("LifeLink live SOS")}
            </h1>
            <p>
              {data
                ? t("{name} sent an SOS ({type}).", { name: data.firstName, type: t(data.type) })
                : t("Loading the latest status…")}
            </p>
          </div>
          {data && <span className={`portal-badge ${badge}`}>{t(STATUS_BADGE_TEXT[data.status] || data.status)}</span>}
        </div>

        {error && <div className="portal-message error">{error}</div>}

        {data && (
          <div className="portal-panel">
            <div className="portal-message success" style={{ margin: 0 }}>
              <strong>{t(STATUS_TEXT[data.status])}</strong>
              {data.responderName && ` ${t("{who} from {name}.", { who: t(who), name: data.responderName })}`}
              {eta &&
                ` ${t("{distance} away · about {minutes} min.", {
                  distance: eta.km < 1 ? `${Math.round(eta.km * 1000)} m` : `${eta.km.toFixed(1)} km`,
                  minutes: eta.minutes,
                })}`}
              {!eta && data.etaMinutes ? ` ${t("Estimated arrival: {minutes} min.", { minutes: data.etaMinutes })}` : ""}
            </div>

            {data.location ? (
              <LiveTrackMap
                you={data.location}
                responder={data.responderLocation}
                responderRole={data.responderRole}
                responderName={data.responderName}
                youLabel={t("{name}'s location", { name: data.firstName })}
              />
            ) : (
              <p style={{ color: "var(--text-secondary)", marginBottom: 0 }}>{t("Live location is hidden once an alert is over.")}</p>
            )}

            <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 0 }}>
              {t("Last update {time} · refreshes automatically.", { time: new Date(data.updatedAt).toLocaleTimeString() })}{" "}
              <a href="tel:112"><Phone size={11} /> {t("Call 112")}</a>
            </p>
          </div>
        )}

        <p style={{ marginTop: 18, fontSize: 12.5 }}>
          <Link to="/">LifeLink AI</Link> — {t("smart emergency & blood donation network.")}
        </p>
      </div>
    </div>
  );
}

export default TrackSos;
