import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, CheckCheck } from "lucide-react";
import AppNavbar from "./AppNavbar";
import { listSOS, acceptSOS, resolveSOS } from "../services/sos";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

const STATUS_BADGE = { pending: "pending", accepted: "hospital", resolved: "approved" };
const TABS = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "resolved", label: "Resolved" },
];

function IncomingPatients() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);

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
      if (action === "accept") await acceptSOS(id);
      else await resolveSOS(id);
      setNotice(`Request marked as ${action === "accept" ? "accepted" : "resolved"}.`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update this request."));
    } finally {
      setBusyId(null);
    }
  };

  const visible = requests.filter((r) => r.status === tab);

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
          <div className="portal-toolbar" style={{ margin: 0 }}>
            {TABS.map((t) => (
              <button
                key={t.value}
                className={`portal-btn ${tab === t.value ? "primary" : "ghost"}`}
                onClick={() => setTab(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        <div className="portal-panel">
          {loading ? (
            <div className="portal-empty">Loading requests…</div>
          ) : visible.length === 0 ? (
            <div className="portal-empty">No {tab} requests right now.</div>
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
                      </td>
                      <td>{new Date(r.createdAt).toLocaleString()}</td>
                      <td>
                        {r.status === "pending" && (
                          <button
                            className="portal-btn primary small"
                            disabled={busyId === r._id}
                            onClick={() => act(r._id, "accept")}
                          >
                            <Check size={14} /> Accept
                          </button>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IncomingPatients;
