/** Compact stat row for a responder's own analytics tab (police/fire/hospital). */
function AgencyAnalyticsPanel({ data }) {
  if (!data) return <div className="portal-empty">Loading analytics…</div>;

  const stats = [
    { label: "Total handled", value: data.total },
    { label: "Accepted", value: data.byStatus?.accepted ?? 0 },
    { label: "Resolved", value: data.byStatus?.resolved ?? 0 },
    { label: "Declined", value: data.byStatus?.declined ?? 0 },
    { label: "False alarms", value: `${data.falseAlarmCount} (${data.falseAlarmRate}%)` },
    { label: "Avg. accept time", value: data.avgAcceptMinutes != null ? `${data.avgAcceptMinutes} min` : "—" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
      {stats.map((s) => (
        <div key={s.label} className="portal-panel" style={{ margin: 0 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{s.label}</div>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

export default AgencyAnalyticsPanel;
