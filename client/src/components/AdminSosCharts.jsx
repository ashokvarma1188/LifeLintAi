import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { MapPin } from "lucide-react";
import MapsLink from "./MapsLink";
import EmptyState from "./EmptyState";

const TYPE_COLORS = { medical: "#e5484d", fire: "#f08c00", accident: "#2a9df4", safety: "#7c5cff", other: "#8a8f98" };
const TOOLTIP_STYLE = { background: "var(--bg-surface)", border: "1px solid var(--border-color)", fontSize: 12 };
const AXIS = { fontSize: 11, fill: "var(--text-secondary)" };

const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** SOS volume over time, what kinds of emergency, and where they cluster — for the admin analytics tab. */
function AdminSosCharts({ sos }) {
  const byDay = sos.byDay || [];
  const typeData = Object.entries(sos.byType || {}).map(([name, value]) => ({ name, value }));
  const areas = sos.busiestAreas || [];

  return (
    <>
      <div className="portal-panel" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 14.5 }}>SOS alerts per day (last 14 days)</h3>
        {byDay.every((d) => d.count === 0) ? (
          <EmptyState title="No SOS alerts in the last 14 days." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={byDay} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="sosDay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e5484d" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#e5484d" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={AXIS} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} formatter={(v) => [v, "Alerts"]} />
              <Area type="monotone" dataKey="count" stroke="#e5484d" strokeWidth={2} fill="url(#sosDay)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div className="portal-panel" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0, fontSize: 14.5 }}>Alerts by type</h3>
          {typeData.length === 0 ? (
            <EmptyState title="No alerts yet." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" tick={AXIS} />
                <YAxis allowDecimals={false} tick={AXIS} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--accent-soft-bg)" }} formatter={(v) => [v, "Alerts"]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {typeData.map((t) => (
                    <Cell key={t.name} fill={TYPE_COLORS[t.name] || "#8a8f98"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="portal-panel" style={{ margin: 0 }}>
          <h3 style={{ marginTop: 0, fontSize: 14.5 }}>Busiest areas (~1 km zones)</h3>
          {areas.length === 0 ? (
            <EmptyState icon={MapPin} title="No located alerts yet." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {areas.map((a, i) => (
                <div key={`${a.lat},${a.lng}`} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent-soft-bg)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1 }}>
                    {a.lat.toFixed(2)}°N, {a.lng.toFixed(2)}°E
                  </span>
                  <strong>{a.count} alert{a.count === 1 ? "" : "s"}</strong>
                  <MapsLink coordinates={[a.lng, a.lat]} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AdminSosCharts;
