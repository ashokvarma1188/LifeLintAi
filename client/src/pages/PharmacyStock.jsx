import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import AppNavbar from "./AppNavbar";
import { getStock, updateStock, updateAvailability, listRequests } from "../services/pharmacy";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

const REQUEST_BADGE = { pending: "pending", fulfilled: "approved", declined: "rejected" };

function PharmacyStock() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("stock");
  const [stock, setStock] = useState([]);
  const [openHours, setOpenHours] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newMed, setNewMed] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [stockData, reqs] = await Promise.all([getStock(), listRequests()]);
      setStock(stockData.stock);
      setOpenHours(stockData.openHours);
      setIsOpen(stockData.isOpen);
      setRequests(reqs);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const addMed = () => {
    if (!newMed.trim()) return;
    setStock([...stock, { medicineName: newMed.trim(), inStock: true, quantity: "" }]);
    setNewMed("");
  };

  const removeMed = (idx) => setStock(stock.filter((_, i) => i !== idx));

  const changeMed = (idx, field, value) =>
    setStock(stock.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));

  const saveStock = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await updateStock(stock);
      setStock(saved);
      setNotice("Stock updated.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not save stock."));
    } finally {
      setSaving(false);
    }
  };

  const saveAvailability = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await updateAvailability({ openHours, isOpen });
      setNotice("Availability updated.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not save availability."));
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
            <h1>Pharmacy</h1>
            <p>Publish your stock and hours, and see incoming medicine requests.</p>
          </div>
          <div className="portal-toolbar" style={{ margin: 0 }}>
            <button className={`portal-btn ${tab === "stock" ? "primary" : "ghost"}`} onClick={() => setTab("stock")}>
              Stock &amp; hours
            </button>
            <button className={`portal-btn ${tab === "requests" ? "primary" : "ghost"}`} onClick={() => setTab("requests")}>
              Requests
            </button>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        {tab === "stock" && (
          <>
            <div className="portal-panel" style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0 }}>Hours &amp; availability</h3>
              <div className="portal-row">
                <div className="portal-field">
                  <label htmlFor="openHours">Open hours</label>
                  <input
                    id="openHours"
                    value={openHours}
                    onChange={(e) => setOpenHours(e.target.value)}
                    placeholder="e.g. 9:00 AM - 9:00 PM"
                  />
                </div>
                <div className="portal-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <input
                    id="isOpen"
                    type="checkbox"
                    checked={isOpen}
                    onChange={(e) => setIsOpen(e.target.checked)}
                    style={{ width: "auto" }}
                  />
                  <label htmlFor="isOpen" style={{ margin: 0 }}>Currently open</label>
                </div>
              </div>
              <div className="portal-form-actions">
                <button className="portal-btn primary" type="button" onClick={saveAvailability} disabled={saving}>
                  <Save size={16} /> Save availability
                </button>
              </div>
            </div>

            <div className="portal-panel">
              <h3 style={{ marginTop: 0 }}>Stock status</h3>
              <div className="portal-toolbar">
                <input
                  placeholder="Medicine name, e.g. Paracetamol"
                  value={newMed}
                  onChange={(e) => setNewMed(e.target.value)}
                />
                <button className="portal-btn primary" type="button" onClick={addMed}>
                  <Plus size={16} /> Add medicine
                </button>
              </div>

              {loading ? (
                <div className="portal-empty">Loading stock…</div>
              ) : stock.length === 0 ? (
                <div className="portal-empty">No medicines added yet. Add one above.</div>
              ) : (
                <div className="portal-table-wrap">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>In stock</th>
                        <th>Quantity</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {stock.map((m, idx) => (
                        <tr key={idx}>
                          <td>{m.medicineName}</td>
                          <td>
                            <select
                              value={m.inStock ? "yes" : "no"}
                              onChange={(e) => changeMed(idx, "inStock", e.target.value === "yes")}
                            >
                              <option value="yes">In stock</option>
                              <option value="no">Out of stock</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              style={{ width: 90 }}
                              value={m.quantity ?? ""}
                              onChange={(e) => changeMed(idx, "quantity", e.target.value)}
                            />
                          </td>
                          <td>
                            <button className="portal-btn danger small" type="button" onClick={() => removeMed(idx)}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="portal-form-actions" style={{ marginTop: 16 }}>
                <button className="portal-btn primary" type="button" onClick={saveStock} disabled={saving}>
                  {saving ? "Saving…" : "Save stock"}
                </button>
              </div>
            </div>
          </>
        )}

        {tab === "requests" && (
          <div className="portal-panel">
            {requests.length === 0 ? (
              <div className="portal-empty">No medicine requests yet.</div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Requested by</th>
                      <th>Medicine</th>
                      <th>Notes</th>
                      <th>Status</th>
                      <th>Requested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r._id}>
                        <td>{r.requestedBy?.name || "Unknown"}</td>
                        <td>{r.medicineName}</td>
                        <td>{r.notes || "—"}</td>
                        <td><span className={`portal-badge ${REQUEST_BADGE[r.status]}`}>{r.status}</span></td>
                        <td>{new Date(r.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PharmacyStock;
