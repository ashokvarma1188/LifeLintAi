import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Send } from "lucide-react";
import AppNavbar from "./AppNavbar";
import { listPharmacies, requestMedicine, myMedicineRequests } from "../services/pharmacyDirectory";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

const REQUEST_BADGE = { pending: "pending", fulfilled: "approved", declined: "rejected" };

function FindPharmacies() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pharmacies");
  const [pharmacies, setPharmacies] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [requesting, setRequesting] = useState(null);
  const [form, setForm] = useState({ medicineName: "", notes: "" });
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([listPharmacies(), myMedicineRequests()]);
      setPharmacies(p);
      setMyRequests(r);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load pharmacies."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  const openRequestForm = (pharmacy) => {
    setRequesting(pharmacy);
    setForm({ medicineName: "", notes: "" });
    setError("");
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!form.medicineName.trim()) return setError("Enter the medicine name.");
    setSending(true);
    setError("");
    try {
      await requestMedicine(requesting._id, form.medicineName.trim(), form.notes.trim());
      setNotice(`Request sent to ${requesting.orgName || requesting.name}.`);
      setRequesting(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not send the request."));
    } finally {
      setSending(false);
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
            <h1>Find pharmacies</h1>
            <p>See what's in stock and request a medicine.</p>
          </div>
          <div className="portal-toolbar" style={{ margin: 0 }}>
            <button className={`portal-btn ${tab === "pharmacies" ? "primary" : "ghost"}`} onClick={() => setTab("pharmacies")}>
              Pharmacies
            </button>
            <button className={`portal-btn ${tab === "mine" ? "primary" : "ghost"}`} onClick={() => setTab("mine")}>
              My requests
            </button>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        {tab === "pharmacies" && (
          <div className="portal-panel">
            {loading ? (
              <div className="portal-empty">Loading pharmacies…</div>
            ) : pharmacies.length === 0 ? (
              <div className="portal-empty">No pharmacies are registered yet.</div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Pharmacy</th>
                      <th>Phone</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Stock</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pharmacies.map((p) => (
                      <tr key={p._id}>
                        <td>{p.orgName || p.name}</td>
                        <td>
                          {p.phone ? (
                            <a href={`tel:${p.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <Phone size={13} /> {p.phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{p.openHours || "—"}</td>
                        <td>
                          <span className={`portal-badge ${p.isOpen !== false ? "approved" : "rejected"}`}>
                            {p.isOpen !== false ? "Open" : "Closed"}
                          </span>
                        </td>
                        <td>
                          {(p.stock || []).length === 0
                            ? "—"
                            : p.stock
                                .filter((s) => s.inStock)
                                .map((s) => s.medicineName)
                                .join(", ") || "None in stock"}
                        </td>
                        <td>
                          <button className="portal-btn primary small" onClick={() => openRequestForm(p)}>
                            <Send size={14} /> Request
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "mine" && (
          <div className="portal-panel">
            {myRequests.length === 0 ? (
              <div className="portal-empty">You haven't sent any medicine requests yet.</div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Pharmacy</th>
                      <th>Medicine</th>
                      <th>Notes</th>
                      <th>Status</th>
                      <th>Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((r) => (
                      <tr key={r._id}>
                        <td>{r.pharmacyId?.orgName || r.pharmacyId?.name || "—"}</td>
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

      {requesting && (
        <div className="portal-modal-backdrop" onClick={() => setRequesting(null)}>
          <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Request medicine from {requesting.orgName || requesting.name}</h2>
            <p className="sub">They'll see this in their incoming requests.</p>
            <form className="portal-form" onSubmit={submitRequest}>
              <div className="portal-field">
                <label htmlFor="medicineName">Medicine name</label>
                <input
                  id="medicineName"
                  value={form.medicineName}
                  onChange={(e) => setForm({ ...form, medicineName: e.target.value })}
                  placeholder="e.g. Paracetamol"
                />
              </div>
              <div className="portal-field">
                <label htmlFor="notes">Notes (optional)</label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Quantity needed, urgency, etc."
                />
              </div>
              <div className="portal-form-actions">
                <button type="button" className="portal-btn ghost" onClick={() => setRequesting(null)} disabled={sending}>
                  Cancel
                </button>
                <button type="submit" className="portal-btn primary" disabled={sending}>
                  {sending ? "Sending…" : "Send request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FindPharmacies;
