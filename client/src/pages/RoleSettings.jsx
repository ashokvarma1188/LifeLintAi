import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, LogOut } from "lucide-react";
import AppNavbar from "./AppNavbar";
import {
  REQUESTABLE_ROLES,
  roleLabel,
  roleNeedsOrg,
  requestRoleChange,
  refreshCurrentUser,
} from "../services/admin";
import { getUser, setTwoFactor, logoutEverywhere, logout } from "../services/auth";
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
  const [twoFAsaving, setTwoFAsaving] = useState(false);
  const [signOutSaving, setSignOutSaving] = useState(false);
  const [securityNotice, setSecurityNotice] = useState("");
  const [securityError, setSecurityError] = useState("");

  const handleToggle2FA = async () => {
    setTwoFAsaving(true);
    setSecurityError("");
    setSecurityNotice("");
    try {
      const data = await setTwoFactor(!user.twoFactorEnabled);
      setUser({ ...user, twoFactorEnabled: data.twoFactorEnabled });
      setSecurityNotice(data.message);
    } catch (err) {
      setSecurityError(getErrorMessage(err, "Could not update two-factor authentication."));
    } finally {
      setTwoFAsaving(false);
    }
  };

  const handleLogoutEverywhere = async () => {
    setSignOutSaving(true);
    setSecurityError("");
    try {
      await logoutEverywhere();
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setSecurityError(getErrorMessage(err, "Could not sign out of all devices."));
      setSignOutSaving(false);
    }
  };

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

        <div className="portal-panel" style={{ marginTop: 20 }}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Security</h3>

          {securityError && <div className="portal-message error">{securityError}</div>}
          {securityNotice && <div className="portal-message success">{securityNotice}</div>}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color-soft)" }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>Two-factor authentication</div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                {user.twoFactorEnabled ? "Enabled — a code is emailed to you at every login." : "Off — add a login code sent to your email."}
              </div>
            </div>
            <button className={`portal-btn ${user.twoFactorEnabled ? "danger" : "primary"} small`} onClick={handleToggle2FA} disabled={twoFAsaving}>
              <ShieldCheck size={14} /> {twoFAsaving ? "Saving…" : user.twoFactorEnabled ? "Disable" : "Enable"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>Sign out of all devices</div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                Invalidates every session, including this one — you'll need to log in again.
              </div>
            </div>
            <button className="portal-btn ghost small" onClick={handleLogoutEverywhere} disabled={signOutSaving}>
              <LogOut size={14} /> {signOutSaving ? "Signing out…" : "Log out everywhere"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleSettings;
