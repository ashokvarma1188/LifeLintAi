import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, CheckCheck, X, Download, Ambulance } from "lucide-react";
import AppNavbar from "./AppNavbar";
import CoverageMap from "../components/CoverageMap";
import MapsLink from "../components/MapsLink";
import AgencyAnalyticsPanel from "../components/AgencyAnalyticsPanel";
import { SkeletonRows } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { listSOS, acceptSOS, declineSOS, resolveSOS, getMyAnalytics } from "../services/sos";
import { getErrorMessage } from "../services/api";
import { playAlertSound } from "../utils/alertSound";
import { downloadCsv } from "../utils/csv";
import "./Dashboard.css";
import "./portal.css";
import useShareResponderLocation from "../hooks/useShareResponderLocation";

const STATUS_BADGE = { pending: "pending", accepted: "hospital", declined: "rejected", resolved: "approved" };
const TABS = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "resolved", label: "Resolved" },
  { value: "declined", label: "Declined" },
];

function IncomingPatients() {
  const navigate = useNavigate();
  const [view, setView] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [etaDrafts, setEtaDrafts] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const knownPendingIds = useRef(new Set());
  const firstLoad = useRef(true);

  // Report this device's position while an accepted/en-route alert is being attended to, so the civilian can follow along.
  useShareResponderLocation(requests.some((x) => x.status === "accepted" || x.status === "en_route"));

  /** `silent` skips the loading spinner/error banner — used for background polling. */
  const load = async (silent = false) => {
    try {
      const [data, an] = await Promise.all([listSOS(), getMyAnalytics().catch(() => null)]);
      const pendingIds = new Set(data.filter((x) => x.status === "pending").map((x) => x._id));
      if (!firstLoad.current && [...pendingIds].some((id) => !knownPendingIds.current.has(id))) {
        playAlertSound();
      }
      knownPendingIds.current = pendingIds;
      firstLoad.current = false;
      setRequests(data);
      setAnalytics(an);
      setError("");
    } catch (err) {
      if (!silent) setError(getErrorMessage(err, "Could not load incoming requests."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
    const interval = setInterval(() => load(true), 20000);
    return () => clearInterval(interval);
  }, []);

  const exportRequestsCsv = () => {
    downloadCsv("lifelink-incoming-patients.csv", visible, [
      { label: "Patient", get: (r) => r.citizenId?.name || "Unknown" },
      { label: "Phone", get: (r) => r.citizenId?.phone || "" },
      { label: "Type", get: (r) => r.type },
      { label: "Status", get: (r) => r.status },
      { label: "Raised", get: (r) => new Date(r.createdAt).toLocaleString() },
    ]);
  };

  const act = async (id, action) => {
    setBusyId(id);
    setNotice("");
    setError("");
    try {
      if (action === "accept") await acceptSOS(id, etaDrafts[id] ? Number(etaDrafts[id]) : undefined);
      else if (action === "decline") await declineSOS(id);
      else if (action === "false-alarm") await resolveSOS(id, true);
      else await resolveSOS(id, false);
      setNotice(action === "false-alarm" ? "Request marked as a false alarm." : `Request marked as ${action === "accept" ? "accepted" : action}.`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update this request."));
    } finally {
      setBusyId(null);
    }
  };

  const visible = requests.filter((r) => r.status === view);

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> Back to dashboard
        </button>

        <div className="portal-head">
          <div>
            <h1>Incoming patients</h1>
            <p>SOS alerts sent by patients, newest first.</p>
          </div>
          <div className="portal-toolbar" style={{ margin: 0, flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button
                key={t.value}
                className={`portal-btn ${view === t.value ? "primary" : "ghost"}`}
                onClick={() => setView(t.value)}
              >
                {t.label}
              </button>
            ))}
            <button className={`portal-btn ${view === "map" ? "primary" : "ghost"}`} onClick={() => setView("map")}>
              Coverage map
            </button>
            <button className={`portal-btn ${view === "analytics" ? "primary" : "ghost"}`} onClick={() => setView("analytics")}>
              Analytics
            </button>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        {view === "analytics" ? (
          <AgencyAnalyticsPanel data={analytics} />
        ) : view === "map" ? (
          <div className="portal-panel">
            <CoverageMap alerts={requests.filter((r) => r.status === "pending" || r.status === "accepted")} />
          </div>
        ) : (
          <div className="portal-panel">
            {visible.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button className="portal-btn ghost small" onClick={exportRequestsCsv}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
            )}
            {loading ? (
              <SkeletonRows rows={5} cols={5} />
            ) : visible.length === 0 ? (
              <EmptyState icon={Ambulance} title={`No ${view} requests right now.`} />
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Phone</th>
                      <th>Type</th>
                      <th>Hospital assigned</th>
                      <th>Status</th>
                      <th>Raised</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={r._id}>
                        <td>{r.citizenId?.name || "Unknown"}</td>
                        <td>{r.citizenId?.phone ? <a href={`tel:${r.citizenId.phone}`} style={{ color: "inherit" }}>{r.citizenId.phone}</a> : "—"}</td>
                        <td>{r.type}</td>
                        <td>{r.assignedHospitalId?.name || "—"}</td>
                        <td>
                          <span className={`portal-badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                          {r.falseAlarm && <span className="portal-badge rejected" style={{ marginLeft: 6 }}>false alarm</span>}
                          {r.etaMinutes != null && r.status === "accepted" && (
                            <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 4 }}>
                              ETA {r.etaMinutes} min
                            </div>
                          )}
                        </td>
                        <td>{new Date(r.createdAt).toLocaleString()}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <MapsLink coordinates={r.location?.coordinates} />
                            {r.status === "pending" && (
                              <>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="ETA min"
                                  value={etaDrafts[r._id] || ""}
                                  onChange={(e) => setEtaDrafts({ ...etaDrafts, [r._id]: e.target.value })}
                                  style={{ width: 70 }}
                                />
                                <button
                                  className="portal-btn primary small"
                                  disabled={busyId === r._id}
                                  onClick={() => act(r._id, "accept")}
                                >
                                  <Check size={14} /> Accept
                                </button>
                                <button
                                  className="portal-btn danger small"
                                  disabled={busyId === r._id}
                                  onClick={() => act(r._id, "decline")}
                                >
                                  <X size={14} /> Decline
                                </button>
                              </>
                            )}
                            {r.status === "accepted" && (
                              <>
                                <button
                                  className="portal-btn primary small"
                                  disabled={busyId === r._id}
                                  onClick={() => act(r._id, "resolve")}
                                >
                                  <CheckCheck size={14} /> Resolve
                                </button>
                                <button
                                  className="portal-btn ghost small"
                                  disabled={busyId === r._id}
                                  onClick={() => act(r._id, "false-alarm")}
                                >
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
      </div>
    </div>
  );
}

export default IncomingPatients;
