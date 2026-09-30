import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Siren, X } from "lucide-react";
import AppNavbar from "./AppNavbar";
import { myRequests, cancelSOS } from "../services/sos";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

const STATUS_BADGE = { pending: "pending", accepted: "hospital", resolved: "approved", cancelled: "rejected" };
const TIMELINE_STEPS = ["pending", "accepted", "resolved"];
const STEP_LABEL = { pending: "Sent", accepted: "Accepted", resolved: "Resolved" };

function Timeline({ status }) {
  if (status === "cancelled") {
    return <div className="portal-badge rejected" style={{ display: "inline-block" }}>Cancelled by you</div>;
  }
  const currentIndex = TIMELINE_STEPS.indexOf(status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {TIMELINE_STEPS.map((step, i) => (
        <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 11.5,
              padding: "3px 9px",
              borderRadius: 999,
              fontWeight: 600,
              background: i <= currentIndex ? "var(--accent-soft-bg)" : "var(--border-color-soft)",
              color: i <= currentIndex ? "var(--accent)" : "var(--text-secondary)",
            }}
          >
            {STEP_LABEL[step]}
          </span>
          {i < TIMELINE_STEPS.length - 1 && (
            <span style={{ width: 14, height: 1, background: i < currentIndex ? "var(--accent)" : "var(--border-color)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function SosHistory() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const data = await myRequests();
      setRequests(data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your SOS history."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const doCancel = async (id) => {
    setBusyId(id);
    setNotice("");
    setError("");
    try {
      await cancelSOS(id);
      setNotice("SOS request cancelled.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not cancel this request."));
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
            <h1>SOS history</h1>
            <p>Every alert you've sent, with its live status.</p>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        <div className="portal-panel">
          {loading ? (
            <div className="portal-empty">Loading your history…</div>
          ) : requests.length === 0 ? (
            <div className="portal-empty">You haven't sent any SOS alerts yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {requests.map((r) => (
                <div key={r._id} className="portal-panel" style={{ margin: 0 }}>
                  <div className="portal-head" style={{ marginBottom: 10 }}>
                    <div>
                      <h1 style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                        <Siren size={15} /> {r.type} SOS
                      </h1>
                      <p>
                        {new Date(r.createdAt).toLocaleString()}
                        {r.assignedHospitalId?.name ? ` · Nearest hospital: ${r.assignedHospitalId.name}` : ""}
                      </p>
                    </div>
                    <span className={`portal-badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                  </div>

                  <Timeline status={r.status} />

                  {r.status === "pending" && (
                    <div style={{ marginTop: 12 }}>
                      <button
                        className="portal-btn danger small"
                        disabled={busyId === r._id}
                        onClick={() => doCancel(r._id)}
                      >
                        <X size={13} /> Cancel this alert
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SosHistory;
