import { useCallback, useEffect, useState } from "react";
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeft, Crosshair, Send, Phone, XCircle, RefreshCw } from "lucide-react";
import { listChecks, createCheck, getCheck, closeCheck } from "../services/safetyChecks";
import { getErrorMessage } from "../services/api";
import MapsLink from "./MapsLink";
import "./SafetyCheckAdmin.css";

const KINDS = [
  { value: "cyclone", label: "🌀 Cyclone" },
  { value: "flood", label: "🌊 Flood" },
  { value: "fire", label: "🔥 Fire" },
  { value: "earthquake", label: "🌍 Earthquake" },
  { value: "heatwave", label: "🌡️ Heatwave" },
  { value: "other", label: "⚠️ Other" },
];
const KIND_ICON = Object.fromEntries(KINDS.map((k) => [k.value, k.label.split(" ")[0]]));
const DEFAULT_CENTER = [16.5062, 80.648]; // Vijayawada
const STATUS_COLOR = { safe: "#0f9d63", need_help: "#dc2626", not_in_area: "#8fa39a" };
const STATUS_LABEL = { safe: "Safe", need_help: "Needs help", not_in_area: "Not in area" };

const toLatLng = ([lng, lat]) => [lat, lng];
const when = (date) => new Date(date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function PickCenter({ onPick }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);
  return null;
}

function Counts({ counts }) {
  return (
    <div className="sca-counts">
      <span className="safe">{counts.safe} safe</span>
      <span className="need_help">{counts.need_help} need help</span>
      <span className="not_in_area">{counts.not_in_area} not in area</span>
    </div>
  );
}

/** Admin Console tab: declare a disaster area, watch answers come in, close it. */
function SafetyCheckAdmin() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", kind: "cyclone", message: "", radiusKm: 15 });
  const [center, setCenter] = useState(null);
  const [sending, setSending] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);

  const loadList = useCallback(async () => {
    try {
      setChecks(await listChecks());
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load Safety Checks."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id) => {
    try {
      setDetail(await getCheck(id));
    } catch (err) {
      setError(getErrorMessage(err, "Could not load this Safety Check."));
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(loadList, 0);
    return () => clearTimeout(first);
  }, [loadList]);

  // Answers keep arriving: refresh the open check every 15 seconds.
  useEffect(() => {
    if (!openId) return undefined;
    const first = setTimeout(() => loadDetail(openId), 0);
    const timer = setInterval(() => loadDetail(openId), 15000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [openId, loadDetail]);

  const centreOnMe = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setCenter([p.coords.latitude, p.coords.longitude]),
      () => setError("Location permission was denied — click the map instead.")
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!form.title.trim()) return setError("Give the Safety Check a title.");
    if (!center) return setError("Click the map to mark the centre of the affected area.");
    setSending(true);
    try {
      await createCheck({ ...form, latitude: center[0], longitude: center[1] });
      setNotice("Safety Check sent. Every civilian is being asked \"Are you safe?\".");
      setForm({ title: "", kind: "cyclone", message: "", radiusKm: 15 });
      setCenter(null);
      await loadList();
    } catch (err) {
      setError(getErrorMessage(err, "Could not send the Safety Check."));
    } finally {
      setSending(false);
    }
  };

  const close = async (id) => {
    if (!window.confirm("Close this Safety Check? People will stop seeing it.")) return;
    try {
      await closeCheck(id);
      await Promise.all([loadList(), loadDetail(id)]);
    } catch (err) {
      setError(getErrorMessage(err, "Could not close it."));
    }
  };

  if (openId && detail) {
    const { check, responses } = detail;
    const needHelp = responses.filter((r) => r.status === "need_help");
    const mapped = responses.filter((r) => r.coordinates);
    return (
      <div className="sca">
        <button className="portal-back" onClick={() => { setOpenId(null); setDetail(null); loadList(); }}>
          <ArrowLeft size={14} /> All Safety Checks
        </button>
        {error && <div className="portal-message error">{error}</div>}
        <div className="sca-detail-head">
          <div>
            <h2>{KIND_ICON[check.kind]} {check.title}</h2>
            <p>{check.message || "No message"} · {check.area.radiusKm} km radius · started {when(check.createdAt)}</p>
            <Counts counts={check.counts} />
          </div>
          <div className="sca-detail-actions">
            <button className="portal-btn ghost small" onClick={() => loadDetail(check._id)}><RefreshCw size={13} /> Refresh</button>
            {check.status === "active" ? (
              <button className="portal-btn danger small" onClick={() => close(check._id)}><XCircle size={13} /> Close check</button>
            ) : (
              <span className="portal-badge rejected">Closed</span>
            )}
          </div>
        </div>

        <div className="sca-map">
          <MapContainer center={toLatLng(check.area.center.coordinates)} zoom={11} style={{ height: "100%", width: "100%" }}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Circle center={toLatLng(check.area.center.coordinates)} radius={check.area.radiusKm * 1000} pathOptions={{ color: "#f59e0b", dashArray: "8 6", fillOpacity: 0.08 }} />
            {mapped.map((r) => (
              <CircleMarker key={r._id} center={toLatLng(r.coordinates)} radius={r.status === "need_help" ? 10 : 7} pathOptions={{ color: "#fff", weight: 2, fillColor: STATUS_COLOR[r.status], fillOpacity: 1 }}>
                <Popup>
                  <strong>{r.name}</strong> — {STATUS_LABEL[r.status]}
                  {r.phone && <><br />{r.phone}</>}
                  {r.distanceKm != null && <><br />{r.distanceKm} km from the centre</>}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <h3 className="sca-subhead">People who need help ({needHelp.length})</h3>
        {needHelp.length === 0 && <p className="sca-muted">Nobody has asked for help in this Safety Check.</p>}
        <div className="sca-help-list">
          {needHelp.map((r) => (
            <div key={r._id} className="sca-help">
              <div>
                <strong>{r.name}</strong>
                <span>{r.distanceKm != null ? `${r.distanceKm} km from the centre · ` : ""}{when(r.updatedAt)} · SOS sent to police & fire</span>
                {r.note && <em>“{r.note}”</em>}
              </div>
              <div className="sca-help-actions">
                {r.phone && <a className="portal-btn ghost small" href={`tel:${r.phone}`}><Phone size={13} /> {r.phone}</a>}
                <MapsLink coordinates={r.coordinates} />
              </div>
            </div>
          ))}
        </div>

        <h3 className="sca-subhead">All answers ({responses.length})</h3>
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead><tr><th>Name</th><th>Answer</th><th>Distance</th><th>When</th></tr></thead>
            <tbody>
              {responses.map((r) => (
                <tr key={r._id}>
                  <td>{r.name}</td>
                  <td><span className={`sca-pill ${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                  <td>{r.distanceKm != null ? `${r.distanceKm} km` : "—"}</td>
                  <td>{when(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="sca">
      {error && <div className="portal-message error">{error}</div>}
      {notice && <div className="portal-message success">{notice}</div>}

      <div className="sca-grid">
        <form className="portal-panel portal-form" onSubmit={submit}>
          <h3 style={{ margin: 0 }}>Declare a Safety Check</h3>
          <p className="sca-muted" style={{ margin: 0 }}>Everyone gets a notification asking &quot;Are you safe?&quot;. &quot;I need help&quot; sends an SOS to police and fire.</p>
          <div className="portal-field">
            <label htmlFor="sc-title">Title</label>
            <input id="sc-title" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Cyclone in Vijayawada" />
          </div>
          <div className="portal-row">
            <div className="portal-field">
              <label htmlFor="sc-kind">Type</label>
              <select id="sc-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div className="portal-field">
              <label htmlFor="sc-radius">Radius: {form.radiusKm} km</label>
              <input id="sc-radius" type="range" min={1} max={100} value={form.radiusKm} onChange={(e) => setForm({ ...form, radiusKm: Number(e.target.value) })} />
            </div>
          </div>
          <div className="portal-field">
            <label htmlFor="sc-message">Message (optional)</label>
            <textarea id="sc-message" value={form.message} maxLength={500} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Stay indoors. Avoid low-lying roads near the river." />
          </div>
          <div className="portal-field">
            <label>Affected area — click the map to set the centre</label>
            <div className="sca-map small">
              <MapContainer center={center || DEFAULT_CENTER} zoom={10} style={{ height: "100%", width: "100%" }}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <PickCenter onPick={setCenter} />
                {center && <Recenter center={center} zoom={10} />}
                {center && <Circle center={center} radius={form.radiusKm * 1000} pathOptions={{ color: "#f59e0b", dashArray: "8 6", fillOpacity: 0.12 }} />}
              </MapContainer>
            </div>
            <span className="hint">
              {center ? `Centre: ${center[0].toFixed(4)}, ${center[1].toFixed(4)}` : "No centre picked yet."}{" "}
              <button type="button" className="portal-back" style={{ margin: 0 }} onClick={centreOnMe}><Crosshair size={12} /> Use my location</button>
            </span>
          </div>
          <div className="portal-form-actions">
            <button className="portal-btn primary" type="submit" disabled={sending}><Send size={15} /> {sending ? "Sending…" : "Send Safety Check"}</button>
          </div>
        </form>

        <div>
          <h3 className="sca-subhead" style={{ marginTop: 0 }}>Safety Checks</h3>
          {loading && <p className="sca-muted">Loading…</p>}
          {!loading && checks.length === 0 && <p className="sca-muted">No Safety Checks yet.</p>}
          <div className="sca-list">
            {checks.map((check) => (
              <button key={check._id} className="sca-item" onClick={() => setOpenId(check._id)}>
                <span className="sca-item-icon">{KIND_ICON[check.kind]}</span>
                <span className="sca-item-text">
                  <strong>{check.title}</strong>
                  <small>{when(check.createdAt)} · {check.area.radiusKm} km</small>
                  <Counts counts={check.counts} />
                </span>
                <span className={`portal-badge ${check.status === "active" ? "approved" : "rejected"}`}>{check.status === "active" ? "Active" : "Closed"}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SafetyCheckAdmin;
