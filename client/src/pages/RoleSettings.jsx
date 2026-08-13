import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppNavbar from "./AppNavbar";
import {
  REQUESTABLE_ROLES,
  roleLabel,
  roleNeedsOrg,
  requestRoleChange,
  refreshCurrentUser,
} from "../services/admin";
import { getUser } from "../services/auth";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

function RoleSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getUser() || {});
  const [role, setRole] = useState(user.role === "citizen" ? "civilian" : user.role || "civilian");
  const [orgName, setOrgName] = useState(user.orgName || "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const needsOrg = roleNeedsOrg(role);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (needsOrg && !orgName.trim()) {
      setError("Organization name is required for this role");
      return;
    }

    setSaving(true);
    try {
      const result = await requestRoleChange(role, orgName.trim());
      setNotice(result.message);
      // Pull the authoritative record back so the badge below is accurate.
      setUser(await refreshCurrentUser());
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit your request."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content" style={{ maxWidth: 620 }}>
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> Back to dashboard
        </button>

        <div className="portal-head">
          <div>
            <h1>Request a role change</h1>
            <p>Organisation accounts are reviewed by an admin before they get access.</p>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        <div className="portal-panel">
          <p style={{ marginTop: 0, fontSize: 14 }}>
            You are currently a <b>{roleLabel(user.role)}</b> account{" "}
            <span className={`portal-badge ${user.roleStatus || "approved"}`}>
              {user.roleStatus || "approved"}
            </span>
          </p>

          <form className="portal-form" onSubmit={submit}>
            <div className="portal-field">
              <label htmlFor="role">Role</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                {REQUESTABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <span className="hint">
                {needsOrg
                  ? "This role needs admin approval before you can use it."
                  : "Civilian accounts are active immediately."}
              </span>
            </div>

            {needsOrg && (
              <div className="portal-field">
                <label htmlFor="orgName">Organisation name *</label>
                <input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Apollo Hospital"
                />
              </div>
            )}

            <div className="portal-form-actions">
              <button className="portal-btn primary" type="submit" disabled={saving}>
                {saving ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RoleSettings;
