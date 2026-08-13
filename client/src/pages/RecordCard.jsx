import { FileText, Pencil, Trash2, Building2 } from "lucide-react";
import { recordTypeLabel, openRecordPdf } from "../services/healthRecords";

/** One medical report row. Edit/delete are hidden on read-only views. */
function RecordCard({ record, onEdit, onDelete, readOnly = false }) {
  const vitals = [
    record.bloodPressure && ["BP", record.bloodPressure],
    record.heartRate != null && ["Heart rate", `${record.heartRate} bpm`],
    record.bloodSugar != null && ["Blood sugar", `${record.bloodSugar} mg/dL`],
    record.weight != null && ["Weight", `${record.weight} kg`],
  ].filter(Boolean);

  return (
    <div className="record-card">
      <div className="record-main">
        <div className="record-title-row">
          <h3>{record.title}</h3>
          <span className="portal-badge type">{recordTypeLabel(record.recordType)}</span>
          {record.createdBy === "hospital" && (
            <span className="portal-badge hospital">
              <Building2 size={11} /> By hospital
            </span>
          )}
          {record.hasPdf && (
            <span className="portal-badge pdf">
              <FileText size={11} /> PDF
            </span>
          )}
        </div>

        <div className="record-meta">
          <span>{record.recordDate}</span>
          {record.hospitalName && <span>{record.hospitalName}</span>}
          {record.doctorName && <span>{record.doctorName}</span>}
        </div>

        {vitals.length > 0 && (
          <div className="record-vitals">
            {vitals.map(([label, value]) => (
              <span key={label}>
                {label}: <b>{value}</b>
              </span>
            ))}
          </div>
        )}

        {record.notes && <p className="record-notes">{record.notes}</p>}
        {record.recommendations && (
          <p className="record-notes">
            <b>Advice:</b> {record.recommendations}
          </p>
        )}
      </div>

      <div className="record-actions">
        {record.hasPdf && (
          <button className="portal-btn ghost small" onClick={() => openRecordPdf(record.id)}>
            <FileText size={14} /> View PDF
          </button>
        )}
        {!readOnly && (
          <>
            <button className="portal-btn ghost small" onClick={() => onEdit(record)}>
              <Pencil size={14} /> Edit
            </button>
            <button className="portal-btn danger small" onClick={() => onDelete(record)}>
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default RecordCard;
