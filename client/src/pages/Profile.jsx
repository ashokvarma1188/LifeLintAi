import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import AppNavbar from "./AppNavbar";
import "./Dashboard.css";
import "./Profile.css";

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
      </div>
    </div>
  );
}

export default Profile;
