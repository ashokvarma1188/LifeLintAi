import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Footprints, Phone } from "lucide-react";
import LiveTrackMap from "../components/LiveTrackMap";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { getPublicWalk } from "../services/safeWalk";
import { useLang } from "../i18n/context";
import "./Dashboard.css";
import "./portal.css";

const POLL_MS = 15000;
const BADGE = { active: "approved", overdue: "pending", alerted: "rejected", arrived: "approved", cancelled: "rejected" };
const STATUS_TEXT = {
  active: "On the way",
  overdue: "Hasn't checked in yet",
  alerted: "Didn't check in — police alerted",
  arrived: "Arrived safely",
  cancelled: "Walk stopped",
};

/** Public page family members open from the "Walk with me" link — no login. */
function WalkTrack() {
  const { token } = useParams();
  const { t } = useLang();
  const [walk, setWalk] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let interval = null;
    const load = async () => {
      try {
        const data = await getPublicWalk(token);
        if (cancelled) return;
        setWalk(data);
        setError("");
        if (["arrived", "cancelled"].includes(data.status)) clearInterval(interval);
      } catch (err) {
        if (!cancelled) setError(err.response?.status === 404 ? "This link is not valid." : "Could not load the status. Retrying…");
      }
    };
    load();
    interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  const time = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="portal-page">
      <div className="portal-content" style={{ maxWidth: 760 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <LanguageSwitcher />
        </div>
        <div className="portal-head">
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Footprints size={20} color="#0f9d63" /> {t("LifeLink — Walk with me")}
            </h1>
            <p>
              {walk
                ? walk.destination
                  ? t("{name} is walking to {place}.", { name: walk.firstName, place: walk.destination })
                  : t("{name} shared their walk with you.", { name: walk.firstName })
                : t("Loading the latest status…")}
            </p>
          </div>
          {walk && <span className={`portal-badge ${BADGE[walk.status]}`}>{t(STATUS_TEXT[walk.status])}</span>}
        </div>

        {error && <div className="portal-message error">{t(error)}</div>}

        {walk && (
          <div className="portal-panel">
            <div className={`portal-message ${walk.status === "alerted" || walk.status === "overdue" ? "error" : "success"}`} style={{ margin: 0 }}>
              {walk.status === "active" && t("Expected to arrive by {time}.", { time: time(walk.expectedArrival) })}
              {walk.status === "overdue" && t("Was expected by {time} and hasn't checked in yet. Try calling them.", { time: time(walk.expectedArrival) })}
              {walk.status === "alerted" && t("Didn't check in after the expected time, so the police were sent an SOS with the last location.")}
              {walk.status === "arrived" && t("Arrived safely at {time}.", { time: time(walk.endedAt) })}
              {walk.status === "cancelled" && t("The walk was stopped.")}
            </div>
            {walk.location ? (
              <LiveTrackMap you={walk.location} youLabel={t("{name}'s location", { name: walk.firstName })} />
            ) : (
              <p style={{ color: "var(--text-secondary)" }}>{t("Live location is hidden once the walk is over.")}</p>
            )}
            {walk.locationUpdatedAt && (
              <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 0 }}>
                {t("Last update {time} · refreshes automatically.", { time: new Date(walk.locationUpdatedAt).toLocaleTimeString() })}{" "}
                <a href="tel:112">
                  <Phone size={11} /> {t("Call 112")}
                </a>
              </p>
            )}
          </div>
        )}

        <p style={{ marginTop: 18, fontSize: 12.5 }}>
          <Link to="/">LifeLink AI</Link> — {t("smart emergency & blood donation network.")}
        </p>
      </div>
    </div>
  );
}

export default WalkTrack;
