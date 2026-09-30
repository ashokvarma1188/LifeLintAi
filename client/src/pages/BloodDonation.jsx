import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Droplet, Phone } from "lucide-react";
import AppNavbar from "./AppNavbar";
import api from "../services/api";
import { listDonors, setDonorStatus } from "../services/donors";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

function BloodDonation() {
  const navigate = useNavigate();
  const [myBloodGroup, setMyBloodGroup] = useState("");
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [donors, setDonors] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadDonors = async (bloodGroup) => {
    try {
      const data = await listDonors(bloodGroup);
      setDonors(data);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load donors."));
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/profile/me");
        setMyBloodGroup(data.bloodGroup || "");
        setAvailable(Boolean(data.donorAvailable));
        await loadDonors("");
      } catch (err) {
        setError(getErrorMessage(err, "Could not load your profile."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleAvailable = async () => {
    if (!myBloodGroup) {
      setError("Set your blood group in My Profile first, so donors can be matched correctly.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const next = !available;
      await setDonorStatus(next, myBloodGroup);
      setAvailable(next);
      setNotice(next ? "You're now listed as an available donor." : "You're no longer listed as a donor.");
      await loadDonors(filter);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update your donor status."));
    } finally {
      setSaving(false);
    }
  };

  const applyFilter = async (bloodGroup) => {
    setFilter(bloodGroup);
    setLoading(true);
    await loadDonors(bloodGroup);
    setLoading(false);
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
            <h1>Blood donation</h1>
            <p>Offer to donate, or find donors nearby by blood group.</p>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        <div className="portal-panel" style={{ marginBottom: 20 }}>
          <div className="portal-head" style={{ marginBottom: 0 }}>
            <div>
              <h1 style={{ fontSize: 18 }}>
                {myBloodGroup ? `Your blood group: ${myBloodGroup}` : "Blood group not set"}
              </h1>
              <p>{available ? "You are listed as an available donor." : "You are not currently listed as a donor."}</p>
            </div>
            <button className={`portal-btn ${available ? "danger" : "primary"}`} onClick={toggleAvailable} disabled={saving}>
              <Droplet size={16} /> {saving ? "Saving…" : available ? "Stop showing as donor" : "I'm available to donate"}
            </button>
          </div>
        </div>

        <div className="portal-toolbar">
          <span className="status-text" style={{ marginRight: 8 }}>Filter by blood group:</span>
          <button className={`portal-btn ${filter === "" ? "primary" : "ghost"} small`} onClick={() => applyFilter("")}>
            All
          </button>
          {BLOOD_GROUPS.map((bg) => (
            <button
              key={bg}
              className={`portal-btn ${filter === bg ? "primary" : "ghost"} small`}
              onClick={() => applyFilter(bg)}
            >
              {bg}
            </button>
          ))}
        </div>

        <div className="portal-panel">
          {loading ? (
            <div className="portal-empty">Loading donors…</div>
          ) : donors.length === 0 ? (
            <div className="portal-empty">No available donors {filter ? `for ${filter}` : ""} right now.</div>
          ) : (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Blood group</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {donors.map((d) => (
                    <tr key={d._id}>
                      <td>{d.name}</td>
                      <td><span className="portal-badge type">{d.bloodGroup}</span></td>
                      <td>
                        {d.phone ? (
                          <a href={`tel:${d.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <Phone size={13} /> {d.phone}
                          </a>
                        ) : (
                          "—"
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

export default BloodDonation;
