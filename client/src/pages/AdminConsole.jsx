import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X } from "lucide-react";
import AppNavbar from "./AppNavbar";
import { listPending, listAllUsers, approveUser, rejectUser, roleLabel } from "../services/admin";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

function AdminConsole() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    // State is only touched after the await, so this never re-renders
    // synchronously from inside the effect.
    (async () => {
      try {
        const data = tab === "pending" ? await listPending() : await listAllUsers();
        if (cancelled) return;
        setUsers(data);
        setError("");
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Could not load accounts."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, reloadKey]);

  const decide = async (user, approve) => {
    setBusyId(user.id);
    setError("");
    try {
      const updated = approve ? await approveUser(user.id) : await rejectUser(user.id);
      setNotice(`${updated.orgName || updated.name} was ${approve ? "approved" : "rejected"}.`);
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the account."));
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
            <h1>Admin console</h1>
            <p>Approve or reject organisation accounts before they get access.</p>
          </div>
          <div className="portal-toolbar" style={{ margin: 0 }}>
            <button
              className={`portal-btn ${tab === "pending" ? "primary" : "ghost"}`}
              onClick={() => { setLoading(true); setTab("pending"); }}
            >
              Pending
            </button>
            <button
              className={`portal-btn ${tab === "all" ? "primary" : "ghost"}`}
              onClick={() => { setLoading(true); setTab("all"); }}
            >
              All accounts
            </button>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        <div className="portal-panel">
          {loading ? (
            <div className="portal-empty">Loading accounts…</div>
          ) : users.length === 0 ? (
            <div className="portal-empty">
              {tab === "pending" ? "No organisation accounts are waiting for approval." : "No accounts found."}
            </div>
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Organisation</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.orgName || "—"}</td>
                      <td>{user.email}</td>
                      <td>{roleLabel(user.role)}</td>
                      <td>
                        <span className={`portal-badge ${user.roleStatus}`}>{user.roleStatus}</span>
                      </td>
                      <td>
                        {user.role !== "admin" && user.roleStatus !== "approved" && (
                          <button
                            className="portal-btn primary small"
                            disabled={busyId === user.id}
                            onClick={() => decide(user, true)}
                          >
                            <Check size={14} /> Approve
                          </button>
                        )}
                        {user.role !== "admin" && user.roleStatus !== "rejected" && (
                          <button
                            className="portal-btn danger small"
                            style={{ marginLeft: 8 }}
                            disabled={busyId === user.id}
                            onClick={() => decide(user, false)}
                          >
                            <X size={14} /> Reject
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

export default AdminConsole;
