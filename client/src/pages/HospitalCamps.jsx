import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Tent, Users, Check, Trash2, ChevronDown, ChevronUp, Phone } from "lucide-react";
import AppNavbar from "./AppNavbar";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { listMyCamps, createCamp, cancelCamp, markDonated } from "../services/camps";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";
import "../components/DonationCamps.css";

const tomorrow = () => {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const EMPTY = { title: "", venue: "", date: tomorrow(), start: "09:00", end: "15:00", capacity: 100, description: "" };

const fmtDay = (date) => new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtTime = (date) => new Date(date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/** Hospital: post blood donation camps, see who registered, mark who donated. */
function HospitalCamps() {
  const navigate = useNavigate();
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      setCamps(await listMyCamps());
      setNow(Date.now());
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your camps."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    return () => clearTimeout(first);
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    const startsAt = new Date(`${form.date}T${form.start}`);
    const endsAt = new Date(`${form.date}T${form.end}`);
    setSaving(true);
    try {
      await createCamp({ title: form.title, venue: form.venue, description: form.description, capacity: Number(form.capacity), startsAt, endsAt });
      setNotice("Camp posted. Donors near you can now see it and register.");
      setForm(EMPTY);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not post the camp."));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (camp) => {
    if (!window.confirm(`Cancel "${camp.title}"? Registered donors will be notified.`)) return;
    setBusy(camp._id);
    try {
      await cancelCamp(camp._id);
      setNotice("Camp cancelled and donors notified.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not cancel the camp."));
    } finally {
      setBusy(null);
    }
  };

  const donated = async (camp, person) => {
    setBusy(`${camp._id}:${person.userId}`);
    setError("");
    try {
      await markDonated(camp._id, person.userId);
      setNotice(`${person.name}'s donation is recorded. They can now download their certificate.`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not record the donation."));
    } finally {
      setBusy(null);
    }
  };

  const upcoming = camps.filter((c) => new Date(c.endsAt).getTime() >= now);
  const past = camps.filter((c) => new Date(c.endsAt).getTime() < now);

  const renderCamp = (camp) => {
    const started = new Date(camp.startsAt).getTime() <= now;
    const ended = new Date(camp.endsAt).getTime() < now;
    const donatedCount = camp.registrations.filter((r) => r.donatedAt).length;
    const open = openId === camp._id;
    return (
      <div key={camp._id} className="portal-panel" style={{ padding: 0, overflow: "hidden" }}>
        <div className="camp-card" style={{ border: "none", boxShadow: "none", borderRadius: 0 }}>
          <div className="camp-date">
            <span className="camp-month">{new Date(camp.startsAt).toLocaleDateString("en-IN", { month: "short" })}</span>
            <span className="camp-day">{new Date(camp.startsAt).getDate()}</span>
            <span className="camp-weekday">{new Date(camp.startsAt).toLocaleDateString("en-IN", { weekday: "short" })}</span>
          </div>
          <div className="camp-body">
            <div className="camp-title-row">
              <h3>{camp.title}</h3>
              {ended ? <span className="portal-badge rejected">Ended</span> : started ? <span className="portal-badge approved">Running now</span> : <span className="portal-badge pending">Upcoming</span>}
            </div>
            <div className="camp-meta">
              <span>{fmtDay(camp.startsAt)} · {fmtTime(camp.startsAt)} – {fmtTime(camp.endsAt)}</span>
              <span>{camp.venue}</span>
            </div>
            <div className="camp-capacity">
              <div className="camp-bar"><span style={{ width: `${Math.min(100, (camp.registeredCount / camp.capacity) * 100)}%` }} /></div>
              <small><Users size={12} /> {camp.registeredCount}/{camp.capacity} registered · {donatedCount} donated</small>
            </div>
          </div>
          <div className="camp-actions">
            <button className="portal-btn ghost small" onClick={() => setOpenId(open ? null : camp._id)}>
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Donors ({camp.registeredCount})
            </button>
            {!ended && (
              <button className="portal-btn ghost small" onClick={() => cancel(camp)} disabled={busy === camp._id}>
                <Trash2 size={14} /> Cancel camp
              </button>
            )}
          </div>
        </div>
        {open && (
          <div style={{ borderTop: "1px solid var(--border-color)", padding: 16 }}>
            {camp.registrations.length === 0 ? (
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>No one has registered yet.</p>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead><tr><th>Name</th><th>Blood group</th><th>Phone</th><th>Registered</th><th>Donation</th></tr></thead>
                  <tbody>
                    {camp.registrations.map((person) => (
                      <tr key={person.userId}>
                        <td>{person.name}</td>
                        <td><strong>{person.bloodGroup || "—"}</strong></td>
                        <td>{person.phone ? <a href={`tel:${person.phone}`}><Phone size={12} /> {person.phone}</a> : "—"}</td>
                        <td>{new Date(person.registeredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                        <td>
                          {person.donatedAt ? (
                            <span className="camp-badge donated"><Check size={12} /> Donated</span>
                          ) : (
                            <button
                              className="portal-btn primary small"
                              onClick={() => donated(camp, person)}
                              disabled={!started || busy === `${camp._id}:${person.userId}`}
                              title={started ? "" : "You can mark donations once the camp starts"}
                            >
                              Mark donated
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="portal-page">
      <AppNavbar showLogout />
      <div className="portal-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> Back to dashboard
        </button>
        <div className="portal-head">
          <div>
            <h1>Blood donation camps</h1>
            <p>Post a camp, see who registered, and mark who donated on the day — donors then get a certificate.</p>
          </div>
          <button className="portal-btn primary" onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> {showForm ? "Close" : "New camp"}
          </button>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        {showForm && (
          <form className="portal-panel portal-form" onSubmit={submit} style={{ marginBottom: 20 }}>
            <div className="portal-row">
              <div className="portal-field">
                <label htmlFor="camp-title">Camp name</label>
                <input id="camp-title" required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="World Blood Donor Day camp" />
              </div>
              <div className="portal-field">
                <label htmlFor="camp-venue">Venue</label>
                <input id="camp-venue" required maxLength={200} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Hospital main hall, Ground floor" />
              </div>
            </div>
            <div className="portal-row">
              <div className="portal-field">
                <label htmlFor="camp-date">Date</label>
                <input id="camp-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="portal-field">
                <label htmlFor="camp-start">Starts</label>
                <input id="camp-start" type="time" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
              </div>
              <div className="portal-field">
                <label htmlFor="camp-end">Ends</label>
                <input id="camp-end" type="time" required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
              </div>
              <div className="portal-field">
                <label htmlFor="camp-capacity">Donor places</label>
                <input id="camp-capacity" type="number" min={5} max={2000} required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
            </div>
            <div className="portal-field">
              <label htmlFor="camp-desc">Details for donors (optional)</label>
              <textarea id="camp-desc" maxLength={600} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Free health check-up and refreshments for every donor." />
              <span className="hint">The camp is shown at your hospital&apos;s listed location.</span>
            </div>
            <div className="portal-form-actions">
              <button className="portal-btn primary" type="submit" disabled={saving}>{saving ? "Posting…" : "Post camp"}</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="portal-panel"><SkeletonRows rows={3} cols={4} /></div>
        ) : camps.length === 0 ? (
          <div className="portal-panel"><EmptyState icon={Tent} title="No camps yet." hint="Post your first blood donation camp with “New camp”." /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {upcoming.map(renderCamp)}
            {past.length > 0 && <h3 style={{ margin: "16px 0 0", fontSize: 15, color: "var(--text-secondary)" }}>Past camps</h3>}
            {past.map(renderCamp)}
          </div>
        )}
      </div>
    </div>
  );
}

export default HospitalCamps;
