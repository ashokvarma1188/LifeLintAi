import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Plus } from "lucide-react";
import AppNavbar from "./AppNavbar";
import RecordForm from "./RecordForm";
import RecordCard from "./RecordCard";
import { searchPatient, getPatientRecords, createPatientRecord } from "../services/healthRecords";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

function HospitalPatients() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);

  const loadRecords = async (patientId) => {
    const data = await getPatientRecords(patientId);
    setPatient(data.patient);
    setRecords(data.records);
  };

  const doSearch = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setPatient(null);
    setRecords([]);
    setSearching(true);

    try {
      const found = await searchPatient(phone.trim());
      await loadRecords(found.id);
    } catch (err) {
      setError(getErrorMessage(err, "Could not search for that patient."));
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (form, pdfFile) => {
    await createPatientRecord(patient.id, form, pdfFile);
    setAdding(false);
    setNotice("Medical report added to the patient's file.");
    await loadRecords(patient.id);
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
            <h1>Patient records</h1>
            <p>Look up a LifeLink patient by phone number and file a medical report.</p>
          </div>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        <form className="portal-toolbar" onSubmit={doSearch}>
          <input
            placeholder="Patient phone number, e.g. 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
          />
          <button className="portal-btn primary" type="submit" disabled={searching}>
            <Search size={16} /> {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {patient && (
          <>
            <div className="portal-panel" style={{ marginBottom: 20 }}>
              <div className="portal-head" style={{ marginBottom: 0 }}>
                <div>
                  <h1 style={{ fontSize: 20 }}>{patient.name}</h1>
                  <p>
                    {patient.phone}
                    {patient.email ? ` · ${patient.email}` : ""}
                    {patient.bloodGroup ? ` · Blood group ${patient.bloodGroup}` : ""}
                    {patient.age ? ` · ${patient.age} yrs` : ""}
                  </p>
                  {patient.allergies?.length > 0 && (
                    <p style={{ marginTop: 6 }}>
                      <b>Allergies:</b> {patient.allergies.join(", ")}
                    </p>
                  )}
                  {patient.medicalHistory?.length > 0 && (
                    <p style={{ marginTop: 4 }}>
                      <b>History:</b> {patient.medicalHistory.join(", ")}
                    </p>
                  )}
                </div>
                <button className="portal-btn primary" onClick={() => setAdding(true)}>
                  <Plus size={16} /> Add report
                </button>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="portal-empty">This patient has no medical reports yet.</div>
            ) : (
              <div className="record-list">
                {records.map((record) => (
                  <RecordCard key={record.id} record={record} readOnly />
                ))}
              </div>
            )}
          </>
        )}

        {!patient && !searching && !error && (
          <div className="portal-empty">
            Search for a patient by their registered phone number to view their file.
          </div>
        )}
      </div>

      {adding && (
        <div className="portal-modal-backdrop" onClick={() => setAdding(false)}>
          <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add report for {patient.name}</h2>
            <p className="sub">This will be filed under your hospital&apos;s name.</p>
            <RecordForm
              onSubmit={handleAdd}
              onCancel={() => setAdding(false)}
              submitLabel="File report"
              showHospitalName={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default HospitalPatients;
