import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, CheckCheck, Trash2 } from "lucide-react";
import AppNavbar from "./AppNavbar";
import { listAlerts, listReports, createReport, updateReportStatus, getFleet, updateFleet } from "../services/firestation";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

const ALERT_BADGE = { pending: "pending", accepted: "hospital", resolved: "approved" };
const REPORT_BADGE = { open: "pending", resolved: "approved" };
const FLEET_STATUSES = ["available", "dispatched", "maintenance"];

function FirestationAlerts() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("alerts");
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [filing, setFiling] = useState(false);
  const [savingFleet, setSavingFleet] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [newUnit, setNewUnit] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [a, r, f] = await Promise.all([listAlerts(), listReports(), getFleet()]);
      setAlerts(a);
      setReports(r);
      setFleet(f);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const submitReport = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("Give the report a title.");
    setFiling(true);
    setError("");
    try {
      await createReport(form);
      setForm({ title: "", description: "" });
      setNotice("Incident report filed.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not file the report."));
    } finally {
      setFiling(false);
    }
  };

  const resolveReport = async (id) => {
    setBusyId(id);
    try {
      await updateReportStatus(id, "resolved");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the report."));
    } finally {
      setBusyId(null);
    }
  };

  const addUnit = () => {
    if (!newUnit.trim()) return;
    setFleet([...fleet, { unitName: newUnit.trim(), status: "available" }]);
    setNewUnit("");
  };

  const removeUnit = (idx) => setFleet(fleet.filter((_, i) => i !== idx));

  const changeUnitStatus = (idx, status) =>
    setFleet(fleet.map((u, i) => (i === idx ? { ...u, status } : u)));

  const saveFleet = async () => {
    setSavingFleet(true);
    setError("");
    setNotice("");
    try {
      const saved = await updateFleet(fleet);
      setFleet(saved);
      setNotice("Fleet status saved.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not save fleet status."));
    } finally {
      setSavingFleet(false);
    }
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
            <h1>Fire station</h1>
            <p>Live SOS alerts, your incident reports, and fleet status.</p>
          </div>
          <div className="portal-toolbar" style={{ margin: 0 }}>
            <button className={`portal-btn ${tab === "alerts" ? "primary" : "ghost"}`} onClick={() => setTab("alerts")}>
              Active calls
            </button>
            <button className={`portal-btn ${tab === "reports" ? "primary" : "ghost"}`} onClick={() => setTab("reports")}>
              Incident reports
            </button>
            <button className={`portal-btn ${tab === "fleet" ? "primary" : "ghost"}`} onClick={() => setTab("fleet")}>
              Fleet status
            </button>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        {tab === "alerts" && (
          <div className="portal-panel">
            {loading ? (
              <div className="portal-empty">Loading alerts…</div>
            ) : alerts.length === 0 ? (
              <div className="portal-empty">No open calls right now.</div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Citizen</th>
                      <th>Phone</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Raised</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((a) => (
                      <tr key={a._id}>
                        <td>{a.citizenId?.name || "Unknown"}</td>
                        <td>{a.citizenId?.phone || "—"}</td>
                        <td>{a.type}</td>
                        <td><span className={`portal-badge ${ALERT_BADGE[a.status]}`}>{a.status}</span></td>
                        <td>{new Date(a.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "reports" && (
          <>
            <div className="portal-panel" style={{ marginBottom: 20 }}>
              <form className="portal-form" onSubmit={submitReport}>
                <div className="portal-field">
                  <label htmlFor="title">Report title</label>
                  <input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Kitchen fire, Sector 5"
                  />
                </div>
                <div className="portal-field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What happened, action taken…"
                  />
                </div>
                <div className="portal-form-actions">
                  <button className="portal-btn primary" type="submit" disabled={filing}>
                    <Plus size={16} /> {filing ? "Filing…" : "File report"}
                  </button>
                </div>
              </form>
            </div>

            <div className="portal-panel">
              {reports.length === 0 ? (
                <div className="portal-empty">No incident reports filed yet.</div>
              ) : (
                <div className="portal-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Filed</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((r) => (
                        <tr key={r._id}>
                          <td>{r.title}</td>
                          <td>{r.description || "—"}</td>
                          <td><span className={`portal-badge ${REPORT_BADGE[r.status]}`}>{r.status}</span></td>
                          <td>{new Date(r.createdAt).toLocaleString()}</td>
                          <td>
                            {r.status === "open" && (
                              <button
                                className="portal-btn primary small"
                                disabled={busyId === r._id}
                                onClick={() => resolveReport(r._id)}
                              >
                                <CheckCheck size={14} /> Resolve
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
          </>
        )}

        {tab === "fleet" && (
          <div className="portal-panel">
            <div className="portal-toolbar">
              <input
                placeholder="Unit name, e.g. Engine 3"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
              />
              <button className="portal-btn primary" type="button" onClick={addUnit}>
                <Plus size={16} /> Add unit
              </button>
            </div>

            {fleet.length === 0 ? (
              <div className="portal-empty">No units added yet. Add one above.</div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {fleet.map((u, idx) => (
                      <tr key={idx}>
                        <td>{u.unitName}</td>
                        <td>
                          <select value={u.status} onChange={(e) => changeUnitStatus(idx, e.target.value)}>
                            {FLEET_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button className="portal-btn danger small" type="button" onClick={() => removeUnit(idx)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="portal-form-actions" style={{ marginTop: 16 }}>
              <button className="portal-btn primary" type="button" onClick={saveFleet} disabled={savingFleet}>
                {savingFleet ? "Saving…" : "Save fleet status"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FirestationAlerts;
