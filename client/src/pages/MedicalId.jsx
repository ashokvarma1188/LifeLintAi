import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Droplet, Phone, AlertCircle, Printer, Eye, FilePlus2 } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import AppNavbar from "./AppNavbar";
import api from "../services/api";
import { listRecords, getAccessLog } from "../services/healthRecords";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";
import { SkeletonRows } from "../components/Skeleton";
import MedicalIdQr from "../components/MedicalIdQr";

const VITALS = [
  { key: "heartRate", label: "Heart rate (bpm)", color: "#e5484d" },
  { key: "bloodSugar", label: "Blood sugar (mg/dL)", color: "#e5a72a" },
  { key: "weight", label: "Weight (kg)", color: "#2a9df4" },
];

function VitalChart({ label, color, points }) {
  if (points.length < 2) {
    return (
      <div className="portal-panel" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 14.5 }}>{label}</h3>
        <div className="portal-empty">Need at least 2 readings to draw a trend.</div>
      </div>
    );
  }
  return (
    <div className="portal-panel" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0, fontSize: 14.5 }}>{label}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color-soft)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--text-secondary)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--text-secondary)" width={36} />
          <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", fontSize: 12 }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MedicalId() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("id");
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [logEntries, setLogEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, recordsData, logData] = await Promise.all([
          api.get("/profile/me"),
          listRecords(),
          getAccessLog(),
        ]);
        setProfile(profileRes.data);
        setRecords(recordsData);
        setLogEntries(logData);
      } catch (err) {
        setError(getErrorMessage(err, "Could not load your medical ID."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const vitalPoints = (key) =>
    records
      .filter((r) => r[key] !== null && r[key] !== undefined)
      .slice()
      .reverse()
      .map((r) => ({ date: r.recordDate, value: r[key] }));

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> Back to dashboard
        </button>

        <div className="portal-head">
          <div>
            <h1>Medical ID</h1>
            <p>Your emergency-ready summary, vitals trends, and who's accessed your records.</p>
          </div>
          <div className="portal-toolbar" style={{ margin: 0 }}>
            <button className={`portal-btn ${tab === "id" ? "primary" : "ghost"}`} onClick={() => setTab("id")}>
              ID card
            </button>
            <button className={`portal-btn ${tab === "vitals" ? "primary" : "ghost"}`} onClick={() => setTab("vitals")}>
              Vitals trends
            </button>
            <button className={`portal-btn ${tab === "log" ? "primary" : "ghost"}`} onClick={() => setTab("log")}>
              Access log
            </button>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}

        {loading ? (
          <div className="portal-panel"><SkeletonRows rows={4} cols={3} /></div>
        ) : (
          <>
            {tab === "id" && profile && (
              <div className="portal-panel" id="medical-id-card">
                <div className="portal-head" style={{ marginBottom: 16 }}>
                  <div>
                    <h1 style={{ fontSize: 20 }}>{profile.name}</h1>
                    <p>{profile.phone || "No phone on file"}{profile.age ? ` · ${profile.age} yrs` : ""}</p>
                  </div>
                  <button className="portal-btn ghost small" onClick={() => window.print()}>
                    <Printer size={14} /> Print
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Blood group</div>
                    <div style={{ fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <Droplet size={18} /> {profile.bloodGroup || "Not set"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Allergies</div>
                    {profile.allergies?.length ? (
                      <div>{profile.allergies.join(", ")}</div>
                    ) : (
                      <div style={{ color: "var(--text-secondary)" }}>None on file</div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Medical history</div>
                    {profile.medicalHistory?.length ? (
                      <div>{profile.medicalHistory.join(", ")}</div>
                    ) : (
                      <div style={{ color: "var(--text-secondary)" }}>None on file</div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Emergency contacts</div>
                  {profile.emergencyContacts?.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {profile.emergencyContacts.map((c, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                          <Phone size={13} /> {c.name} ({c.relation || "contact"}) —{" "}
                          {c.phone ? <a href={`tel:${c.phone}`} style={{ color: "inherit" }}>{c.phone}</a> : "—"}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="portal-empty" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start" }}>
                      <AlertCircle size={14} /> No emergency contacts added yet — add some from My Profile.
                    </div>
                  )}
                </div>

                <MedicalIdQr initialToken={profile.medicalIdToken} />
              </div>
            )}

            {tab === "vitals" && (
              <>
                {VITALS.map(({ key, label, color }) => (
                  <VitalChart key={key} label={label} color={color} points={vitalPoints(key)} />
                ))}
              </>
            )}

            {tab === "log" && (
              <div className="portal-panel">
                {logEntries.length === 0 ? (
                  <div className="portal-empty">No hospital has viewed or added to your records yet.</div>
                ) : (
                  <div className="portal-table-wrap">
                    <table className="portal-table">
                      <thead>
                        <tr>
                          <th>Hospital</th>
                          <th>Action</th>
                          <th>When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logEntries.map((e) => (
                          <tr key={e._id}>
                            <td>{e.hospitalId?.orgName || e.hospitalId?.name || "Unknown"}</td>
                            <td style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {e.action === "viewed" ? <Eye size={13} /> : <FilePlus2 size={13} />}
                              {e.action === "viewed" ? "Viewed your file" : "Added a report"}
                            </td>
                            <td>{new Date(e.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MedicalId;
