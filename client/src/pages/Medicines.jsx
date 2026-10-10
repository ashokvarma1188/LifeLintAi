import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pill, Plus, Trash2, Pause, Play, Check, Clock, X } from "lucide-react";
import AppNavbar from "./AppNavbar";
import NotificationToggle from "../components/NotificationToggle";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { listMedicines, addMedicine, setMedicineActive, deleteMedicine, markDoseTaken } from "../services/medicines";
import { getErrorMessage } from "../services/api";
import { useLang } from "../i18n/context";
import "./Dashboard.css";
import "./portal.css";
import "./Medicines.css";

const EMPTY_FORM = { name: "", dose: "", notes: "", times: ["08:00"] };

/** Current HH:MM in India — the same clock the server uses to send reminders. */
const istTimeNow = () =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());

function Medicines() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [medicines, setMedicines] = useState([]);
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [now, setNow] = useState(istTimeNow);

  const load = useCallback(async () => {
    try {
      const data = await listMedicines();
      setMedicines(data.medicines);
      setToday(data.today);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your medicines."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
    const clock = setInterval(() => setNow(istTimeNow()), 30000);
    return () => clearInterval(clock);
  }, [load]);

  const replace = (updated) => setMedicines((list) => list.map((m) => (m._id === updated._id ? updated : m)));

  const act = async (id, action) => {
    setBusyId(id);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setBusyId(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!form.name.trim()) return setError("Enter the medicine name.");
    setSaving(true);
    try {
      const created = await addMedicine({ ...form, times: form.times.filter(Boolean) });
      setMedicines((list) => [...list, created]);
      setForm(EMPTY_FORM);
      setNotice("Medicine added. You'll get a notification at each time.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not add this medicine."));
    } finally {
      setSaving(false);
    }
  };

  const setTime = (index, value) => setForm((f) => ({ ...f, times: f.times.map((time, i) => (i === index ? value : time)) }));

  // Today's doses across all active medicines, earliest first.
  const doses = medicines
    .filter((m) => m.active)
    .flatMap((m) => m.times.map((time) => ({ med: m, time, taken: m.taken.includes(`${today} ${time}`) })))
    .sort((a, b) => a.time.localeCompare(b.time));
  const takenCount = doses.filter((d) => d.taken).length;

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> {t("Back to dashboard")}
        </button>

        <div className="portal-head">
          <div>
            <h1>{t("Medicine reminders")}</h1>
            <p>{t("Add your medicines and times — LifeLink reminds you at each dose and you tick it off.")}</p>
          </div>
        </div>

        <NotificationToggle role="civilian" />

        {error && <div className="portal-message error">{t(error)}</div>}
        {notice && <div className="portal-message success">{t(notice)}</div>}

        <div className="portal-panel" style={{ marginBottom: 20 }}>
          <div className="med-today-head">
            <h3>{t("Today")}</h3>
            {doses.length > 0 && <span className="portal-badge approved">{t("{done} of {total} taken", { done: takenCount, total: doses.length })}</span>}
          </div>
          {loading ? (
            <SkeletonRows rows={3} cols={3} />
          ) : doses.length === 0 ? (
            <EmptyState icon={Clock} title={t("No doses scheduled for today.")} hint={t("Add a medicine below to start getting reminders.")} />
          ) : (
            <div className="med-doses">
              {doses.map(({ med, time, taken }) => {
                const due = !taken && time <= now;
                return (
                  <div key={`${med._id}-${time}`} className={`med-dose${taken ? " taken" : due ? " due" : ""}`}>
                    <span className="med-dose-time">{time}</span>
                    <div className="med-dose-name">
                      <strong>{med.name}</strong>
                      {med.dose && <span>{med.dose}</span>}
                    </div>
                    <button
                      className={`portal-btn small ${taken ? "ghost" : "primary"}`}
                      disabled={busyId === med._id}
                      onClick={() => act(med._id, async () => replace(await markDoseTaken(med._id, time, !taken)))}
                    >
                      {taken ? <><Check size={13} /> {t("Taken")}</> : due ? t("Take now") : t("Mark taken")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="portal-panel" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>{t("My medicines")}</h3>
          {!loading && medicines.length === 0 && <div className="portal-empty">{t("No medicines added yet.")}</div>}
          <div className="med-list">
            {medicines.map((m) => (
              <div key={m._id} className={`med-card${m.active ? "" : " paused"}`}>
                <div className="med-card-icon">
                  <Pill size={18} />
                </div>
                <div className="med-card-body">
                  <strong>{m.name}</strong>
                  {m.dose && <span className="med-card-dose">{m.dose}</span>}
                  <div className="med-times">
                    {m.times.map((time) => (
                      <span key={time} className="med-time-chip">
                        <Clock size={11} /> {time}
                      </span>
                    ))}
                    {!m.active && <span className="portal-badge pending">{t("Paused")}</span>}
                  </div>
                  {m.notes && <span className="med-card-notes">{m.notes}</span>}
                </div>
                <div className="med-card-actions">
                  <button
                    className="portal-btn ghost small"
                    disabled={busyId === m._id}
                    onClick={() => act(m._id, async () => replace(await setMedicineActive(m._id, !m.active)))}
                  >
                    {m.active ? <><Pause size={13} /> {t("Pause")}</> : <><Play size={13} /> {t("Resume")}</>}
                  </button>
                  <button
                    className="portal-btn danger small"
                    disabled={busyId === m._id}
                    onClick={() =>
                      act(m._id, async () => {
                        await deleteMedicine(m._id);
                        setMedicines((list) => list.filter((x) => x._id !== m._id));
                      })
                    }
                    aria-label={t("Remove")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="portal-panel">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>{t("Add a medicine")}</h3>
          <form className="portal-form" onSubmit={submit}>
            <div className="portal-row">
              <div className="portal-field">
                <label htmlFor="medName">{t("Medicine name")}</label>
                <input id="medName" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("e.g. Metformin")} />
              </div>
              <div className="portal-field">
                <label htmlFor="medDose">{t("Dose (optional)")}</label>
                <input id="medDose" value={form.dose} maxLength={60} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder={t("e.g. 500 mg, 1 tablet after food")} />
              </div>
            </div>
            <div className="portal-field">
              <label>{t("Times each day")}</label>
              <div className="med-time-inputs">
                {form.times.map((time, i) => (
                  <span key={i} className="med-time-input">
                    <input type="time" value={time} onChange={(e) => setTime(i, e.target.value)} aria-label={t("Time")} />
                    {form.times.length > 1 && (
                      <button type="button" onClick={() => setForm((f) => ({ ...f, times: f.times.filter((_, j) => j !== i) }))} aria-label={t("Remove time")}>
                        <X size={13} />
                      </button>
                    )}
                  </span>
                ))}
                {form.times.length < 6 && (
                  <button type="button" className="portal-btn ghost small" onClick={() => setForm((f) => ({ ...f, times: [...f.times, "20:00"] }))}>
                    <Plus size={13} /> {t("Add time")}
                  </button>
                )}
              </div>
            </div>
            <div className="portal-field">
              <label htmlFor="medNotes">{t("Notes (optional)")}</label>
              <input id="medNotes" value={form.notes} maxLength={200} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("e.g. Prescribed by Dr. Rao")} />
            </div>
            <div className="portal-form-actions">
              <button type="submit" className="portal-btn primary" disabled={saving}>
                <Plus size={15} /> {saving ? t("Saving…") : t("Add medicine")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Medicines;
