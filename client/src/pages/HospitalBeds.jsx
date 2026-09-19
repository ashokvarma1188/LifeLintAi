import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import AppNavbar from "./AppNavbar";
import { listHospitals, updateHospital } from "../services/hospitals";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

function HospitalBeds() {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({ totalBeds: "", availableBeds: "", ambulanceAvailable: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await listHospitals();
        setHospitals(data);
      } catch (err) {
        setError(getErrorMessage(err, "Could not load hospitals."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectHospital = (id) => {
    setSelectedId(id);
    setNotice("");
    const h = hospitals.find((x) => x._id === id);
    if (h) {
      setForm({
        totalBeds: h.totalBeds ?? "",
        availableBeds: h.availableBeds ?? "",
        ambulanceAvailable: h.ambulanceAvailable ?? true,
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      setError("Pick your hospital first.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateHospital(selectedId, {
        totalBeds: Number(form.totalBeds) || 0,
        availableBeds: Number(form.availableBeds) || 0,
        ambulanceAvailable: form.ambulanceAvailable,
      });
      setHospitals((prev) => prev.map((h) => (h._id === updated._id ? updated : h)));
      setNotice("Bed and ambulance availability updated.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not save changes."));
    } finally {
      setSaving(false);
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
            <h1>Bed availability</h1>
            <p>Keep your hospital&apos;s bed and ambulance status up to date so patients see it live.</p>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        <div className="portal-panel">
          {loading ? (
            <div className="portal-empty">Loading hospitals…</div>
          ) : hospitals.length === 0 ? (
            <div className="portal-empty">No hospitals are registered yet.</div>
          ) : (
            <form onSubmit={handleSave} className="portal-form">
              <div className="portal-field">
                <label htmlFor="hospital">Your hospital</label>
                <select id="hospital" value={selectedId} onChange={(e) => selectHospital(e.target.value)}>
                  <option value="">Select a hospital…</option>
                  {hospitals.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>

              {selectedId && (
                <>
                  <div className="portal-row">
                    <div className="portal-field">
                      <label htmlFor="totalBeds">Total beds</label>
                      <input
                        id="totalBeds"
                        type="number"
                        min="0"
                        value={form.totalBeds}
                        onChange={(e) => setForm({ ...form, totalBeds: e.target.value })}
                      />
                    </div>
                    <div className="portal-field">
                      <label htmlFor="availableBeds">Available beds</label>
                      <input
                        id="availableBeds"
                        type="number"
                        min="0"
                        value={form.availableBeds}
                        onChange={(e) => setForm({ ...form, availableBeds: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="portal-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <input
                      id="ambulanceAvailable"
                      type="checkbox"
                      checked={form.ambulanceAvailable}
                      onChange={(e) => setForm({ ...form, ambulanceAvailable: e.target.checked })}
                      style={{ width: "auto" }}
                    />
                    <label htmlFor="ambulanceAvailable" style={{ margin: 0 }}>Ambulance available</label>
                  </div>

                  <div className="portal-form-actions">
                    <button className="portal-btn primary" type="submit" disabled={saving}>
                      <Save size={16} /> {saving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default HospitalBeds;
