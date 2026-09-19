import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, CheckCheck } from "lucide-react";
import AppNavbar from "./AppNavbar";
import { listAlerts, listReports, createReport, updateReportStatus } from "../services/police";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

const ALERT_BADGE = { pending: "pending", accepted: "hospital", resolved: "approved" };
const REPORT_BADGE = { open: "pending", resolved: "approved" };

function PoliceAlerts() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("alerts");
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [filing, setFiling] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([listAlerts(), listReports()]);
      setAlerts(a);
      setReports(r);
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

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> Back to dashboard
        </button>

        <div className="portal-head">
          <div>
            <h1>Police</h1>
            <p>Live SOS alerts and your filed incident reports.</p>
          </div>
          <div className="portal-toolbar" style={{ margin: 0 }}>
            <button className={`portal-btn ${tab === "alerts" ? "primary" : "ghost"}`} onClick={() => setTab("alerts")}>
              Incoming alerts
            </button>
            <button className={`portal-btn ${tab === "reports" ? "primary" : "ghost"}`} onClick={() => setTab("reports")}>
              Incident reports
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
              <div className="portal-empty">No open alerts right now.</div>
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
                <div className="portal-row">
                  <div className="portal-field">
                    <label htmlFor="title">Report title</label>
                    <input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Traffic accident on MG Road"
                    />
                  </div>
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
      </div>
    </div>
  );
}

export default PoliceAlerts;
