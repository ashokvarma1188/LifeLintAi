import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, FileText } from "lucide-react";
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
import { SkeletonRows } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import HealthSummaryButton from "../components/HealthSummaryButton";
import { useLang } from "../i18n/context";

function HealthRecords() {
  const { t } = useLang();
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
      setNotice(t("Medical report added."));
    } else {
      await updateRecord(editing.id, form, pdfFile, removePdf);
      setNotice(t("Medical report updated."));
    }
    setEditing(null);
    load();
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete "${record.title}"? This cannot be undone.`)) return;
    try {
      await deleteRecord(record.id);
      setNotice(t("Medical report deleted."));
      load();
    } catch (err) {
      setError(getErrorMessage(err, t("Could not delete the report.")));
    }
  };

  return (
    <div className="portal-page">
      <AppNavbar showLogout />

      <div className="portal-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> {t("Back to dashboard")}
        </button>

        <div className="portal-head">
          <div>
            <h1>{t("Health records")}</h1>
            <p>{t("Your medical reports, vitals and documents in one place.")}</p>
          </div>
          <div className="portal-toolbar" style={{ margin: 0 }}>
            <HealthSummaryButton />
            <button className="portal-btn primary" onClick={() => setEditing("new")}>
              <Plus size={16} /> {t("Add report")}
            </button>
          </div>
        </div>

        {error && <div className="portal-message error">{t(error)}</div>}
        {notice && <div className="portal-message success">{notice}</div>}

        {stats && (
          <div className="portal-stats">
            <div className="portal-stat">
              <span className="num">{stats.total}</span>
              <span className="label">{t("Total reports")}</span>
            </div>
            <div className="portal-stat">
              <span className="num">{stats.withPdf}</span>
              <span className="label">{t("With PDF")}</span>
            </div>
            <div className="portal-stat">
              <span className="num">{stats.latest?.bloodPressure || "—"}</span>
              <span className="label">{t("Latest BP")}</span>
            </div>
            <div className="portal-stat">
              <span className="num">{stats.latest?.heartRate ?? "—"}</span>
              <span className="label">{t("Latest heart rate")}</span>
            </div>
            <div className="portal-stat">
              <span className="num">{stats.latest?.weight ?? "—"}</span>
              <span className="label">{t("Latest weight (kg)")}</span>
            </div>
          </div>
        )}

        <div className="portal-toolbar">
          <input
            placeholder={t("Search by title, hospital or doctor…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">{t("All types")}</option>
            {RECORD_TYPES.map((recordType) => (
              <option key={recordType.value} value={recordType.value}>{t(recordType.label)}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <SkeletonRows rows={4} cols={4} />
        ) : records.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={
              search || typeFilter
                ? t("No reports match your search.")
                : t("No medical reports yet. Add your first one to keep your history in one place.")
            }
          />
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
            <h2>{editing === "new" ? t("Add medical report") : t("Edit medical report")}</h2>
            <p className="sub">{t("Fields marked * are required.")}</p>
            <RecordForm
              initial={editing === "new" ? null : editing}
              onSubmit={handleSave}
              onCancel={() => setEditing(null)}
              submitLabel={editing === "new" ? t("Add report") : t("Save changes")}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthRecords;
