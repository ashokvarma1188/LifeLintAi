import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, CheckCheck, X } from "lucide-react";
import AppNavbar from "./AppNavbar";
import CoverageMap from "../components/CoverageMap";
import MapsLink from "../components/MapsLink";
import { listSOS, acceptSOS, declineSOS, resolveSOS } from "../services/sos";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

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

  const load = async () => {
    try {
      const data = await listSOS();
      setRequests(data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load incoming requests."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const act = async (id, action) => {
    setBusyId(id);
    setNotice("");
    setError("");
    try {
      if (action === "accept") await acceptSOS(id, etaDrafts[id] ? Number(etaDrafts[id]) : undefined);
      else if (action === "decline") await declineSOS(id);
      else await resolveSOS(id);
      setNotice(`Request marked as ${action === "accept" ? "accepted" : action}.`);
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
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        {view === "map" ? (
          <div className="portal-panel">
            <CoverageMap alerts={requests.filter((r) => r.status === "pending" || r.status === "accepted")} />
          </div>
        ) : (
          <div className="portal-panel">
            {loading ? (
              <div className="portal-empty">Loading requests…</div>
            ) : visible.length === 0 ? (
              <div className="portal-empty">No {view} requests right now.</div>
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
                        <td>{r.citizenId?.phone || "—"}</td>
                        <td>{r.type}</td>
                        <td>{r.assignedHospitalId?.name || "—"}</td>
                        <td>
                          <span className={`portal-badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
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
                              <button
                                className="portal-btn primary small"
                                disabled={busyId === r._id}
                                onClick={() => act(r._id, "resolve")}
                              >
                                <CheckCheck size={14} /> Resolve
                              </button>
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
