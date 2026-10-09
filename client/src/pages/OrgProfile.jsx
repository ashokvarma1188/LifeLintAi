import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, UserPlus, Trash2, MapPin } from "lucide-react";
import AppNavbar from "./AppNavbar";
import { getOrgProfile, updateOrgProfile, updateOrgLocation, listStaff, createStaff, removeStaff } from "../services/orgProfile";
import { getUser } from "../services/auth";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";
import { SkeletonRows } from "../components/Skeleton";

function OrgProfile() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ orgName: "", licenseNumber: "", logoUrl: "", serviceRadiusKm: "", openHours: "", isOpen: true, phone: "" });
  const [staff, setStaff] = useState([]);
  const [staffForm, setStaffForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingStaff, setAddingStaff] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [locating, setLocating] = useState(false);

  const role = getUser()?.role;
  const canSetLocation = ["police", "firestation", "pharmacy"].includes(role);

  const updateMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported on this device/browser.");
      return;
    }
    setLocating(true);
    setError("");
    setNotice("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const updated = await updateOrgLocation(position.coords.latitude, position.coords.longitude);
          setProfile(updated);
          setNotice("Location updated — civilians can now find you in the nearby directory.");
        } catch (err) {
          setError(getErrorMessage(err, "Could not update location."));
        } finally {
          setLocating(false);
        }
      },
      () => {
        setError("Location access denied.");
        setLocating(false);
      }
    );
  };

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([getOrgProfile(), listStaff().catch(() => [])]);
      setProfile(p);
      setForm({
        orgName: p.orgName || "",
        licenseNumber: p.licenseNumber || "",
        logoUrl: p.logoUrl || "",
        serviceRadiusKm: p.serviceRadiusKm ?? "",
        openHours: p.openHours || "",
        isOpen: p.isOpen !== false,
        phone: p.phone || "",
      });
      setStaff(s);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load organisation profile."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateOrgProfile({
        ...form,
        serviceRadiusKm: form.serviceRadiusKm === "" ? undefined : Number(form.serviceRadiusKm),
      });
      setProfile(updated);
      setNotice("Organisation profile updated.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not save changes."));
    } finally {
      setSaving(false);
    }
  };

  const addStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.email.trim() || staffForm.password.length < 6) {
      return setError("Name, email, and a 6+ character password are required.");
    }
    setAddingStaff(true);
    setError("");
    setNotice("");
    try {
      await createStaff(staffForm);
      setStaffForm({ name: "", email: "", password: "" });
      setNotice("Staff account created — they can log in immediately.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not create the staff account."));
    } finally {
      setAddingStaff(false);
    }
  };

  const deleteStaff = async (id) => {
    setError("");
    try {
      await removeStaff(id);
      setNotice("Staff account removed.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove this staff account."));
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
            <h1>Organisation profile</h1>
            <p>Manage how your organisation appears, and who can log in on its behalf.</p>
          </div>
          <div className="portal-toolbar" style={{ margin: 0 }}>
            <button className={`portal-btn ${tab === "profile" ? "primary" : "ghost"}`} onClick={() => setTab("profile")}>
              Profile
            </button>
            <button className={`portal-btn ${tab === "staff" ? "primary" : "ghost"}`} onClick={() => setTab("staff")}>
              Staff accounts
            </button>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        {loading ? (
          <div className="portal-panel"><SkeletonRows rows={4} cols={3} /></div>
        ) : tab === "profile" ? (
          <div className="portal-panel">
            {profile?.verified && (
              <div className="portal-badge approved" style={{ display: "inline-block", marginBottom: 16 }}>
                ✓ Verified organisation
              </div>
            )}

            <form className="portal-form" onSubmit={saveProfile}>
              <div className="portal-row">
                <div className="portal-field">
                  <label htmlFor="orgName">Organisation name</label>
                  <input id="orgName" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} />
                </div>
                <div className="portal-field">
                  <label htmlFor="phone">Phone</label>
                  <input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>

              <div className="portal-field">
                <label htmlFor="licenseNumber">Licence / registration number</label>
                <input id="licenseNumber" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
              </div>

              <div className="portal-field">
                <label htmlFor="logoUrl">Logo URL</label>
                <input
                  id="logoUrl"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="portal-row">
                <div className="portal-field">
                  <label htmlFor="serviceRadiusKm">Service radius (km)</label>
                  <input
                    id="serviceRadiusKm"
                    type="number"
                    min="0"
                    value={form.serviceRadiusKm}
                    onChange={(e) => setForm({ ...form, serviceRadiusKm: e.target.value })}
                  />
                </div>
                <div className="portal-field">
                  <label htmlFor="openHours">Hours</label>
                  <input
                    id="openHours"
                    value={form.openHours}
                    onChange={(e) => setForm({ ...form, openHours: e.target.value })}
                    placeholder="e.g. 24x7, or 9 AM - 9 PM"
                  />
                </div>
              </div>

              <div className="portal-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input
                  id="isOpen"
                  type="checkbox"
                  checked={form.isOpen}
                  onChange={(e) => setForm({ ...form, isOpen: e.target.checked })}
                  style={{ width: "auto" }}
                />
                <label htmlFor="isOpen" style={{ margin: 0 }}>Currently open / available</label>
              </div>

              <div className="portal-form-actions">
                <button className="portal-btn primary" type="submit" disabled={saving}>
                  <Save size={16} /> {saving ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>

            {canSetLocation && (
              <div className="portal-field" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-color-soft)" }}>
                <label>Location</label>
                <span className="hint" style={{ display: "block", marginBottom: 8 }}>
                  {profile?.location
                    ? "Your location is set — civilians can find you in the nearby directory."
                    : "Not set yet — civilians won't see you in the nearby directory until you set this."}
                </span>
                <button className="portal-btn ghost small" type="button" onClick={updateMyLocation} disabled={locating}>
                  <MapPin size={14} /> {locating ? "Getting location…" : "Update to my current location"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="portal-panel" style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0, fontSize: 14.5 }}>Add a staff account</h3>
              <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: -8 }}>
                Staff share your organisation's role and dashboard, and are approved automatically.
              </p>
              <form className="portal-form" onSubmit={addStaff}>
                <div className="portal-row">
                  <div className="portal-field">
                    <label htmlFor="staffName">Name</label>
                    <input id="staffName" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
                  </div>
                  <div className="portal-field">
                    <label htmlFor="staffEmail">Email</label>
                    <input id="staffEmail" type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
                  </div>
                  <div className="portal-field">
                    <label htmlFor="staffPassword">Password</label>
                    <input id="staffPassword" type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
                  </div>
                </div>
                <div className="portal-form-actions">
                  <button className="portal-btn primary" type="submit" disabled={addingStaff}>
                    <UserPlus size={16} /> {addingStaff ? "Adding…" : "Add staff account"}
                  </button>
                </div>
              </form>
            </div>

            <div className="portal-panel">
              {staff.length === 0 ? (
                <div className="portal-empty">No staff accounts yet.</div>
              ) : (
                <div className="portal-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Added</th><th /></tr>
                    </thead>
                    <tbody>
                      {staff.map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>{s.email}</td>
                          <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button className="portal-btn danger small" onClick={() => deleteStaff(s.id)}>
                              <Trash2 size={14} /> Remove
                            </button>
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

export default OrgProfile;
