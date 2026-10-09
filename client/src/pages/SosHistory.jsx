import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Siren, X, History } from "lucide-react";
import AppNavbar from "./AppNavbar";
import MapsLink from "../components/MapsLink";
import { myRequests, cancelSOS } from "../services/sos";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";
import { SkeletonRows } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

const STATUS_BADGE = { pending: "pending", accepted: "hospital", resolved: "approved", cancelled: "rejected" };
const TIMELINE_STEPS = ["pending", "accepted", "resolved"];
const STEP_LABEL = { pending: "Sent", accepted: "Accepted", resolved: "Resolved" };
const CANCEL_REASON_LABEL = { safe_now: "I'm safe now", sent_by_mistake: "Sent by mistake", other: "Other" };

function Timeline({ status, cancelReason }) {
  if (status === "cancelled") {
    return (
      <div className="portal-badge rejected" style={{ display: "inline-block" }}>
        Cancelled by you{cancelReason ? ` — ${CANCEL_REASON_LABEL[cancelReason]}` : ""}
      </div>
    );
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
  const [cancelingId, setCancelingId] = useState(null);

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

  const doCancel = async (id, reason) => {
    setBusyId(id);
    setCancelingId(null);
    setNotice("");
    setError("");
    try {
      await cancelSOS(id, reason);
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
            <SkeletonRows rows={3} cols={4} />
          ) : requests.length === 0 ? (
            <EmptyState icon={History} title="You haven't sent any SOS alerts yet." hint="Alerts you send from the dashboard will show up here with live status." />
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

                  <Timeline status={r.status} cancelReason={r.cancelReason} />

                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <MapsLink coordinates={r.location?.coordinates} />
                    {r.status === "pending" && cancelingId !== r._id && (
                      <button
                        className="portal-btn danger small"
                        disabled={busyId === r._id}
                        onClick={() => setCancelingId(r._id)}
                      >
                        <X size={13} /> Cancel this alert
                      </button>
                    )}
                    {r.status === "pending" && cancelingId === r._id && (
                      <>
                        <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Why?</span>
                        <button className="portal-btn ghost small" disabled={busyId === r._id} onClick={() => doCancel(r._id, "safe_now")}>
                          I&apos;m safe now
                        </button>
                        <button className="portal-btn ghost small" disabled={busyId === r._id} onClick={() => doCancel(r._id, "sent_by_mistake")}>
                          Sent by mistake
                        </button>
                        <button className="portal-btn ghost small" disabled={busyId === r._id} onClick={() => doCancel(r._id, "other")}>
                          Other
                        </button>
                        <button className="portal-back" style={{ margin: 0 }} onClick={() => setCancelingId(null)}>
                          Back
                        </button>
                      </>
                    )}
                  </div>
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
