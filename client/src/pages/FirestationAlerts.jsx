import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Plus, CheckCheck, Trash2, Check, X, Download } from "lucide-react";
import AppNavbar from "./AppNavbar";
import CoverageMap from "../components/CoverageMap";
import MapsLink from "../components/MapsLink";
import AgencyAnalyticsPanel from "../components/AgencyAnalyticsPanel";
import { listAlerts, listReports, createReport, updateReportStatus, getFleet, updateFleet } from "../services/firestation";
import { acceptSOS, declineSOS, enRouteSOS, resolveSOS, getMyAnalytics } from "../services/sos";
import { getErrorMessage } from "../services/api";
import { playAlertSound } from "../utils/alertSound";
import { downloadCsv } from "../utils/csv";
import "./Dashboard.css";
import "./portal.css";

const ALERT_BADGE = { pending: "pending", accepted: "hospital", en_route: "hospital", resolved: "approved" };
const ALERT_STATUS_LABEL = { en_route: "en route" };
const REPORT_BADGE = { open: "pending", resolved: "approved" };
const FLEET_STATUSES = ["available", "dispatched", "maintenance"];

function FirestationAlerts() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || "alerts");
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [filing, setFiling] = useState(false);
  const [savingFleet, setSavingFleet] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [newUnit, setNewUnit] = useState("");
  const [etaInputs, setEtaInputs] = useState({});
  const knownPendingIds = useRef(new Set());
  const firstLoad = useRef(true);

  /** `silent` skips the loading spinner/error banner — used for background polling. */
  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [a, r, f, an] = await Promise.all([listAlerts(), listReports(), getFleet(), getMyAnalytics().catch(() => null)]);
      const pendingIds = new Set(a.filter((x) => x.status === "pending").map((x) => x._id));
      if (!firstLoad.current && [...pendingIds].some((id) => !knownPendingIds.current.has(id))) {
        playAlertSound();
      }
      knownPendingIds.current = pendingIds;
      firstLoad.current = false;
      setAlerts(a);
      setReports(r);
      setFleet(f);
      setAnalytics(an);
      setError("");
    } catch (err) {
      if (!silent) setError(getErrorMessage(err, "Could not load data."));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
    const interval = setInterval(() => load(true), 20000);
    return () => clearInterval(interval);
  }, []);

  const exportAlertsCsv = () => {
    downloadCsv("lifelink-firestation-alerts.csv", alerts, [
      { label: "Citizen", get: (a) => a.citizenId?.name || "Unknown" },
      { label: "Phone", get: (a) => a.citizenId?.phone || "" },
      { label: "Type", get: (a) => a.type },
      { label: "Status", get: (a) => a.status },
      { label: "Raised", get: (a) => new Date(a.createdAt).toLocaleString() },
    ]);
  };

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

  const actOnAlert = async (id, action) => {
    setBusyId(id);
    setNotice("");
    setError("");
    try {
      if (action === "accept") {
        const eta = etaInputs[id];
        await acceptSOS(id, eta ? Number(eta) : undefined);
      } else if (action === "decline") await declineSOS(id);
      else if (action === "en-route") await enRouteSOS(id);
      else if (action === "false-alarm") await resolveSOS(id, true);
      else await resolveSOS(id, false);
      const ACTION_LABEL = { accept: "accepted", "en-route": "en route", "false-alarm": "a false alarm" };
      setNotice(`Alert marked as ${ACTION_LABEL[action] || action}.`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update this alert."));
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
            <button className={`portal-btn ${tab === "map" ? "primary" : "ghost"}`} onClick={() => setTab("map")}>
              Coverage map
            </button>
            <button className={`portal-btn ${tab === "analytics" ? "primary" : "ghost"}`} onClick={() => setTab("analytics")}>
              Analytics
            </button>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        {tab === "analytics" && <AgencyAnalyticsPanel data={analytics} />}

        {tab === "map" && (
          <div className="portal-panel">
            <CoverageMap alerts={alerts} />
          </div>
        )}

        {tab === "alerts" && (
          <div className="portal-panel">
            {alerts.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button className="portal-btn ghost small" onClick={exportAlertsCsv}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
            )}
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
                      <th>Hospital assigned</th>
                      <th>Status</th>
                      <th>Raised</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((a) => (
                      <tr key={a._id}>
                        <td>{a.citizenId?.name || "Unknown"}</td>
                        <td>{a.citizenId?.phone || "—"}</td>
                        <td>{a.type}</td>
                        <td>
                          {a.assignedHospitalId ? (
                            <div style={{ fontSize: 13 }}>
                              <div>{a.assignedHospitalId.name}</div>
                              <div style={{ color: "var(--text-secondary)" }}>
                                {a.assignedHospitalId.availableBeds ?? "?"} beds free
                                {" · "}
                                {a.assignedHospitalId.ambulanceAvailable
                                  ? `ambulance (${a.assignedHospitalId.ambulanceCount ?? "?"})`
                                  : "no ambulance"}
                              </div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span className={`portal-badge ${ALERT_BADGE[a.status]}`}>
                            {ALERT_STATUS_LABEL[a.status] || a.status}
                          </span>
                          {a.falseAlarm && <span className="portal-badge rejected" style={{ marginLeft: 6 }}>false alarm</span>}
                        </td>
                        <td>{new Date(a.createdAt).toLocaleString()}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <MapsLink coordinates={a.location?.coordinates} />
                            {a.status === "pending" && (
                              <>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="ETA min"
                                  value={etaInputs[a._id] || ""}
                                  onChange={(e) => setEtaInputs({ ...etaInputs, [a._id]: e.target.value })}
                                  style={{ width: 70 }}
                                />
                                <button className="portal-btn primary small" disabled={busyId === a._id} onClick={() => actOnAlert(a._id, "accept")}>
                                  <Check size={14} /> Accept
                                </button>
                                <button className="portal-btn danger small" disabled={busyId === a._id} onClick={() => actOnAlert(a._id, "decline")}>
                                  <X size={14} /> Decline
                                </button>
                              </>
                            )}
                            {a.status === "accepted" && (
                              <>
                                {a.etaMinutes != null && (
                                  <span className="portal-badge pending">ETA {a.etaMinutes}m</span>
                                )}
                                <button className="portal-btn primary small" disabled={busyId === a._id} onClick={() => actOnAlert(a._id, "en-route")}>
                                  En route
                                </button>
                                <button className="portal-btn ghost small" disabled={busyId === a._id} onClick={() => actOnAlert(a._id, "resolve")}>
                                  <CheckCheck size={14} /> Resolve
                                </button>
                                <button className="portal-btn ghost small" disabled={busyId === a._id} onClick={() => actOnAlert(a._id, "false-alarm")}>
                                  False alarm
                                </button>
                              </>
                            )}
                            {a.status === "en_route" && (
                              <>
                                <button className="portal-btn primary small" disabled={busyId === a._id} onClick={() => actOnAlert(a._id, "resolve")}>
                                  <CheckCheck size={14} /> Resolve
                                </button>
                                <button className="portal-btn ghost small" disabled={busyId === a._id} onClick={() => actOnAlert(a._id, "false-alarm")}>
                                  False alarm
                                </button>
                              </>
                            )}
                          </div>
                        </td>
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
