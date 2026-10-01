import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Trash2 } from "lucide-react";
import api from "../services/api";
import { logout } from "../services/auth";
import AppNavbar from "./AppNavbar";
import "./Dashboard.css";
import "./Profile.css";
import "./portal.css";

function Profile() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    age: "",
    bloodGroup: "",
    medicalHistory: "",
    allergies: "",
    emergencyContacts: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/profile/me");
        const data = res.data;
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          age: data.age || "",
          bloodGroup: data.bloodGroup || "",
          medicalHistory: (data.medicalHistory || []).join(", "),
          allergies: (data.allergies || []).join(", "),
          emergencyContacts: data.emergencyContacts?.length
            ? data.emergencyContacts
            : [{ name: "", phone: "", relation: "" }],
        });
      } catch (err) {
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleContactChange = (index, field, value) => {
    const updated = [...form.emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, emergencyContacts: updated });
  };

  const addContact = () => {
    setForm({
      ...form,
      emergencyContacts: [...form.emergencyContacts, { name: "", phone: "", relation: "" }],
    });
  };

  const removeContact = (index) => {
    setForm({
      ...form,
      emergencyContacts: form.emergencyContacts.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        age: form.age ? Number(form.age) : undefined,
        bloodGroup: form.bloodGroup,
        medicalHistory: form.medicalHistory
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        allergies: form.allergies
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        emergencyContacts: form.emergencyContacts.filter((c) => c.name || c.phone),
      };

      const res = await api.put("/profile/me", payload);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await api.get("/profile/export");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lifelink-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Could not export your data.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete("/profile/me", { data: { password: deletePassword } });
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Could not delete your account.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="dash-wrapper">
        <AppNavbar />
        <div className="profile-content">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-wrapper">
      <AppNavbar />

      <div className="profile-content">
        <a className="back-link" onClick={() => navigate("/dashboard")}>
          ← Back to Dashboard
        </a>

        <div className="profile-header">
          <h1>My Profile</h1>
          <p>Keep this updated — it's what responders see during an emergency.</p>
        </div>

        {error && <div className="auth-message error">{error}</div>}
        {success && <div className="auth-message success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="profile-card">
            <div className="profile-section">
              <div className="profile-section-title">Basic Info</div>
              <div className="profile-row">
                <div className="auth-field">
                  <label>Full Name</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} required />
                </div>
                <div className="auth-field">
                  <label>Phone</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} />
                </div>
              </div>
              <div className="profile-row">
                <div className="auth-field">
                  <label>Age</label>
                  <input type="number" name="age" value={form.age} onChange={handleChange} min="0" />
                </div>
                <div className="auth-field">
                  <label>Blood Group</label>
                  <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="profile-section">
              <div className="profile-section-title">Medical Info</div>
              <div className="auth-field">
                <label>Medical History</label>
                <input
                  type="text"
                  name="medicalHistory"
                  placeholder="e.g. Asthma, Diabetes"
                  value={form.medicalHistory}
                  onChange={handleChange}
                />
                <div className="tag-input-hint">Separate multiple items with commas</div>
              </div>
              <div className="auth-field">
                <label>Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  placeholder="e.g. Penicillin, Peanuts"
                  value={form.allergies}
                  onChange={handleChange}
                />
                <div className="tag-input-hint">Separate multiple items with commas</div>
              </div>
            </div>

            <div className="profile-section">
              <div className="profile-section-title">Emergency Contacts</div>
              {form.emergencyContacts.map((contact, index) => (
                <div className="contact-card" key={index}>
                  {form.emergencyContacts.length > 1 && (
                    <button
                      type="button"
                      className="contact-remove"
                      onClick={() => removeContact(index)}
                    >
                      Remove
                    </button>
                  )}
                  <div className="profile-row">
                    <div className="auth-field">
                      <label>Name</label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => handleContactChange(index, "name", e.target.value)}
                      />
                    </div>
                    <div className="auth-field">
                      <label>Phone</label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => handleContactChange(index, "phone", e.target.value)}
                      />
                    </div>
                    <div className="auth-field">
                      <label>Relation</label>
                      <input
                        type="text"
                        placeholder="e.g. Father"
                        value={contact.relation}
                        onChange={(e) => handleContactChange(index, "relation", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="add-contact-btn" onClick={addContact}>
                + Add another contact
              </button>
            </div>

            <div className="profile-save-row">
              <button className="auth-submit" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>

        <div className="profile-card" style={{ marginTop: 20 }}>
          <div className="profile-section">
            <div className="profile-section-title">Privacy &amp; Data</div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-color-soft)" }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Download my data</div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                  Your profile, health records, and SOS history as a JSON file.
                </div>
              </div>
              <button className="portal-btn ghost small" type="button" onClick={handleExportData} disabled={exporting}>
                <Download size={14} /> {exporting ? "Preparing…" : "Download"}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Delete my account</div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                  Permanently removes your account, health records, and SOS history. This can't be undone.
                </div>
              </div>
              <button className="portal-btn danger small" type="button" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={14} /> Delete account
              </button>
            </div>

            {showDeleteConfirm && (
              <form onSubmit={handleDeleteAccount} style={{ marginTop: 12, padding: 12, border: "1px solid var(--danger)", borderRadius: 10 }}>
                <p style={{ fontSize: 13, marginTop: 0 }}>
                  Enter your password to permanently delete your account. This cannot be undone.
                </p>
                {deleteError && <div className="auth-message error">{deleteError}</div>}
                <div className="auth-field">
                  <input
                    type="password"
                    placeholder="Your password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="portal-btn danger small" type="submit" disabled={deleting}>
                    {deleting ? "Deleting…" : "Confirm delete"}
                  </button>
                  <button
                    className="portal-btn ghost small"
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteError("");
                      setDeletePassword("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
