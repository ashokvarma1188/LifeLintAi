import { useCallback, useEffect, useState } from "react";
import { MapPin, Clock, Users, Check, Tent, Building2 } from "lucide-react";
import { listCamps, registerForCamp, cancelRegistration } from "../services/camps";
import { getErrorMessage } from "../services/api";
import MapsLink from "./MapsLink";
import EmptyState from "./EmptyState";
import { SkeletonRows } from "./Skeleton";
import { useLang } from "../i18n/context";
import { speechLangFor } from "../i18n/languages";
import "./DonationCamps.css";

/** Upcoming blood donation camps posted by hospitals, with one-tap registration. */
function DonationCamps({ coords }) {
  const { t, lang } = useLang();
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const locale = speechLangFor(lang);

  const load = useCallback(async () => {
    try {
      setCamps(await listCamps(coords || undefined));
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load donation camps."));
    } finally {
      setLoading(false);
    }
  }, [coords]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    return () => clearTimeout(first);
  }, [load]);

  const toggle = async (camp) => {
    setBusyId(camp._id);
    setError("");
    setNotice("");
    try {
      const updated = camp.isRegistered ? await cancelRegistration(camp._id) : await registerForCamp(camp._id);
      setCamps((list) => list.map((c) => (c._id === camp._id ? { ...c, ...updated, distanceKm: c.distanceKm } : c)));
      setNotice(camp.isRegistered ? "Registration cancelled." : "You're registered! Bring an ID card and eat a light meal before you donate.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not update your registration."));
    } finally {
      setBusyId(null);
    }
  };

  const day = (date) => new Date(date).toLocaleDateString(locale, { day: "numeric" });
  const month = (date) => new Date(date).toLocaleDateString(locale, { month: "short" });
  const time = (date) => new Date(date).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const weekday = (date) => new Date(date).toLocaleDateString(locale, { weekday: "long" });

  if (loading) return <div className="portal-panel"><SkeletonRows rows={3} cols={3} /></div>;

  return (
    <div className="camps">
      {error && <div className="portal-message error">{t(error)}</div>}
      {notice && <div className="portal-message success">{t(notice)}</div>}
      {camps.length === 0 ? (
        <div className="portal-panel">
          <EmptyState icon={Tent} title={t("No donation camps coming up")} hint={t("Hospitals post camps here. Check back soon.")} />
        </div>
      ) : (
        <div className="camp-list">
          {camps.map((camp) => {
            const full = camp.registeredCount >= camp.capacity;
            const percent = Math.min(100, Math.round((camp.registeredCount / camp.capacity) * 100));
            return (
              <div key={camp._id} className={`camp-card${camp.isRegistered ? " registered" : ""}`}>
                <div className="camp-date">
                  <span className="camp-month">{month(camp.startsAt)}</span>
                  <span className="camp-day">{day(camp.startsAt)}</span>
                  <span className="camp-weekday">{weekday(camp.startsAt)}</span>
                </div>
                <div className="camp-body">
                  <div className="camp-title-row">
                    <h3>{camp.title}</h3>
                    {camp.donated ? (
                      <span className="camp-badge donated"><Check size={12} /> {t("Donated")}</span>
                    ) : camp.isRegistered ? (
                      <span className="camp-badge"><Check size={12} /> {t("Registered")}</span>
                    ) : null}
                  </div>
                  <div className="camp-meta">
                    <span><Building2 size={13} /> {camp.organiserName}</span>
                    <span><Clock size={13} /> {time(camp.startsAt)} – {time(camp.endsAt)}</span>
                    <span><MapPin size={13} /> {camp.venue}{camp.distanceKm != null ? ` · ${t("{km} km away", { km: camp.distanceKm })}` : ""}</span>
                  </div>
                  {camp.description && <p className="camp-desc">{camp.description}</p>}
                  <div className="camp-capacity">
                    <div className="camp-bar"><span style={{ width: `${percent}%` }} /></div>
                    <small><Users size={12} /> {t("{count} of {capacity} places taken", { count: camp.registeredCount, capacity: camp.capacity })}</small>
                  </div>
                </div>
                <div className="camp-actions">
                  {!camp.donated && (
                    <button
                      className={`portal-btn ${camp.isRegistered ? "ghost" : "primary"} small`}
                      onClick={() => toggle(camp)}
                      disabled={busyId === camp._id || (!camp.isRegistered && full)}
                    >
                      {busyId === camp._id ? t("Saving…") : camp.isRegistered ? t("Cancel registration") : full ? t("Camp full") : t("Register to donate")}
                    </button>
                  )}
                  <MapsLink coordinates={camp.coordinates} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DonationCamps;
