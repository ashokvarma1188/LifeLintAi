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
  const [form, setForm] = useState({
    phone: "", totalBeds: "", availableBeds: "", icuBeds: "", icuAvailableBeds: "",
    ambulanceAvailable: true, ambulanceCount: "", bloodBankAvailable: false, oxygenAvailable: true,
  });
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
        phone: h.phone ?? "",
        totalBeds: h.totalBeds ?? "",
        availableBeds: h.availableBeds ?? "",
        icuBeds: h.icuBeds ?? "",
        icuAvailableBeds: h.icuAvailableBeds ?? "",
        ambulanceAvailable: h.ambulanceAvailable ?? true,
        ambulanceCount: h.ambulanceCount ?? "",
        bloodBankAvailable: h.bloodBankAvailable ?? false,
        oxygenAvailable: h.oxygenAvailable ?? true,
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
        phone: form.phone.trim(),
        totalBeds: Number(form.totalBeds) || 0,
        availableBeds: Number(form.availableBeds) || 0,
        icuBeds: Number(form.icuBeds) || 0,
        icuAvailableBeds: Number(form.icuAvailableBeds) || 0,
        ambulanceAvailable: form.ambulanceAvailable,
        ambulanceCount: Number(form.ambulanceCount) || 0,
        bloodBankAvailable: form.bloodBankAvailable,
        oxygenAvailable: form.oxygenAvailable,
      });
      setHospitals((prev) => prev.map((h) => (h._id === updated._id ? updated : h)));
      setNotice("Availability updated.");
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
                  <div className="portal-field">
                    <label htmlFor="phone">Contact phone</label>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
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
                  <div className="portal-row">
                    <div className="portal-field">
                      <label htmlFor="icuBeds">ICU beds</label>
                      <input
                        id="icuBeds"
                        type="number"
                        min="0"
                        value={form.icuBeds}
                        onChange={(e) => setForm({ ...form, icuBeds: e.target.value })}
                      />
                    </div>
                    <div className="portal-field">
                      <label htmlFor="icuAvailableBeds">ICU beds available</label>
                      <input
                        id="icuAvailableBeds"
                        type="number"
                        min="0"
                        value={form.icuAvailableBeds}
                        onChange={(e) => setForm({ ...form, icuAvailableBeds: e.target.value })}
                      />
                    </div>
                    <div className="portal-field">
                      <label htmlFor="ambulanceCount">Ambulances available</label>
                      <input
                        id="ambulanceCount"
                        type="number"
                        min="0"
                        value={form.ambulanceCount}
                        onChange={(e) => setForm({ ...form, ambulanceCount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="portal-row">
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
                    <div className="portal-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <input
                        id="bloodBankAvailable"
                        type="checkbox"
                        checked={form.bloodBankAvailable}
                        onChange={(e) => setForm({ ...form, bloodBankAvailable: e.target.checked })}
                        style={{ width: "auto" }}
                      />
                      <label htmlFor="bloodBankAvailable" style={{ margin: 0 }}>Blood bank available</label>
                    </div>
                    <div className="portal-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <input
                        id="oxygenAvailable"
                        type="checkbox"
                        checked={form.oxygenAvailable}
                        onChange={(e) => setForm({ ...form, oxygenAvailable: e.target.checked })}
                        style={{ width: "auto" }}
                      />
                      <label htmlFor="oxygenAvailable" style={{ margin: 0 }}>Oxygen available</label>
                    </div>
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
