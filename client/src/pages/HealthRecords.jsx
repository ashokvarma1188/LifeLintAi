import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import AppNavbar from "./AppNavbar";
import RecordForm from "./RecordForm";
import RecordCard from "./RecordCard";
import {
  RECORD_TYPES,
  listRecords,
  getStats,
  createRecord,
  updateRecord,
  deleteRecord,
} from "../services/healthRecords";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./portal.css";

function HealthRecords() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null); // record being edited, or "new"

  const load = useCallback(async () => {
    setError("");
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (typeFilter) params.recordType = typeFilter;

      const [list, summary] = await Promise.all([listRecords(params), getStats()]);
      setRecords(list);
      setStats(summary);
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your medical reports."));
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const handleSave = async (form, pdfFile, removePdf) => {
    if (editing === "new") {
      await createRecord(form, pdfFile);
      setNotice("Medical report added.");
    } else {
      await updateRecord(editing.id, form, pdfFile, removePdf);
      setNotice("Medical report updated.");
    }
    setEditing(null);
    load();
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete "${record.title}"? This cannot be undone.`)) return;
    try {
      await deleteRecord(record.id);
      setNotice("Medical report deleted.");
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete the report."));
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
            <h1>Health records</h1>
            <p>Your medical reports, vitals and documents in one place.</p>
          </div>
          <button className="portal-btn primary" onClick={() => setEditing("new")}>
            <Plus size={16} /> Add report
          </button>
        </div>

        {error && <div className="portal-message error">{error}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        {stats && (
          <div className="portal-stats">
            <div className="portal-stat">
              <span className="num">{stats.total}</span>
              <span className="label">Total reports</span>
            </div>
            <div className="portal-stat">
              <span className="num">{stats.withPdf}</span>
              <span className="label">With PDF</span>
            </div>
            <div className="portal-stat">
              <span className="num">{stats.latest?.bloodPressure || "—"}</span>
              <span className="label">Latest BP</span>
            </div>
            <div className="portal-stat">
              <span className="num">{stats.latest?.heartRate ?? "—"}</span>
              <span className="label">Latest heart rate</span>
            </div>
            <div className="portal-stat">
              <span className="num">{stats.latest?.weight ?? "—"}</span>
              <span className="label">Latest weight (kg)</span>
            </div>
          </div>
        )}

        <div className="portal-toolbar">
          <input
            placeholder="Search by title, hospital or doctor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {RECORD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="portal-empty">Loading your reports…</div>
        ) : records.length === 0 ? (
          <div className="portal-empty">
            {search || typeFilter
              ? "No reports match your search."
              : "No medical reports yet. Add your first one to keep your history in one place."}
          </div>
        ) : (
          <div className="record-list">
            {records.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onEdit={setEditing}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="portal-modal-backdrop" onClick={() => setEditing(null)}>
          <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing === "new" ? "Add medical report" : "Edit medical report"}</h2>
            <p className="sub">Fields marked * are required.</p>
            <RecordForm
              initial={editing === "new" ? null : editing}
              onSubmit={handleSave}
              onCancel={() => setEditing(null)}
              submitLabel={editing === "new" ? "Add report" : "Save changes"}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthRecords;
