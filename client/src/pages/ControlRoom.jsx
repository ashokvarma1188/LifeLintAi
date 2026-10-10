import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowLeft, Bell, BellOff, Maximize, Minimize, Siren, Flame, Car, ShieldAlert, HeartPulse, CircleHelp, LocateFixed, Radar,
} from "lucide-react";
import { getControlRoom } from "../services/controlRoom";
import { getErrorMessage } from "../services/api";
import { playAlertSound } from "../utils/alertSound";
import MapsLink from "../components/MapsLink";
import "./ControlRoom.css";

const POLL_MS = 10000;
const INDIA_CENTER = [20.5937, 78.9629];

const TYPE = {
  medical: { label: "Medical", icon: HeartPulse },
  fire: { label: "Fire", icon: Flame },
  accident: { label: "Accident", icon: Car },
  safety: { label: "Safety", icon: ShieldAlert },
  other: { label: "Other", icon: CircleHelp },
};
const STATUS = { pending: "Waiting", accepted: "Accepted", en_route: "En route" };
const TARGET = { hospital: "Hospital", police: "Police", firestation: "Fire" };
const KIND_ICON = { flood: "🌊", cyclone: "🌀", fire: "🔥", earthquake: "🌍", heatwave: "🌡️", other: "⚠️" };

const toLatLng = ([lng, lat]) => [lat, lng];

const minutesAgo = (date, now) => {
  const mins = Math.max(0, Math.round((now - new Date(date).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min ago`;
};

/** Hospital colour by free beds: none → red, few → amber, plenty → green. */
const bedLevel = (h) => {
  if (!h.availableBeds) return "full";
  if (h.availableBeds < 5 || (h.totalBeds && h.availableBeds / h.totalBeds < 0.25)) return "low";
  return "ok";
};

const alertIcon = (status, fresh) =>
  L.divIcon({
    className: "",
    html: `<span class="cr-pin ${status}${fresh ? " fresh" : ""}"><span></span></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
const hospitalIcon = (level) =>
  L.divIcon({ className: "", html: `<span class="cr-hosp ${level}">H</span>`, iconSize: [22, 22], iconAnchor: [11, 11] });
const responderIcon = L.divIcon({ className: "", html: '<span class="cr-responder"></span>', iconSize: [14, 14], iconAnchor: [7, 7] });

/** Frames everything on the first load, and whenever "Show all" is pressed. */
function FitToData({ points, trigger }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 13);
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, points.length > 0]);
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target.position, 15, { duration: 0.8 });
  }, [map, target]);
  return null;
}

/** Live city map of open SOS alerts, hospital capacity and Safety Checks, for admins and responders. */
function ControlRoom() {
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const seenRef = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [soundOn, setSoundOn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fresh, setFresh] = useState([]);
  const [toast, setToast] = useState("");
  const [focus, setFocus] = useState(null);
  const [fitKey, setFitKey] = useState(0);
  const soundRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const next = await getControlRoom();
      const ids = next.alerts.map((a) => a._id);
      if (seenRef.current) {
        const added = next.alerts.filter((a) => !seenRef.current.has(a._id));
        if (added.length) {
          setFresh(added.map((a) => a._id));
          setToast(`New SOS: ${added.map((a) => TYPE[a.type]?.label || a.type).join(", ")}`);
          if (soundRef.current) playAlertSound();
        }
      }
      seenRef.current = new Set(ids);
      setData(next);
      setNow(Date.now());
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load the control room."));
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => {
      setToast("");
      setFresh([]);
    }, 8000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundRef.current = next;
    if (next) playAlertSound(); // the click also unlocks audio in the browser
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else pageRef.current?.requestFullscreen?.();
  };

  // Frame the open alerts when there are any; "Show all" (or a quiet city) frames every hospital too.
  const points = useMemo(() => {
    if (!data) return [];
    const alerts = data.alerts.map((a) => toLatLng(a.coordinates));
    if (alerts.length && fitKey === 0) return alerts;
    return [...alerts, ...data.hospitals.map((h) => toLatLng(h.coordinates))];
  }, [data, fitKey]);

  const stats = data?.stats;

  return (
    <div className="cr-page" ref={pageRef}>
      <header className="cr-top">
        <div className="cr-title">
          {!fullscreen && (
            <button className="cr-icon-btn" onClick={() => navigate("/dashboard")} title="Back to dashboard">
              <ArrowLeft size={18} />
            </button>
          )}
          <Radar size={22} className="cr-radar" />
          <div>
            <h1>Live City Control Room</h1>
            <span className="cr-live">
              <i /> LIVE · updated {data ? minutesAgo(data.generatedAt, now) : "…"} · refreshes every 10 s
            </span>
          </div>
        </div>
        <div className="cr-tools">
          <button className={`cr-tool${soundOn ? " on" : ""}`} onClick={toggleSound}>
            {soundOn ? <Bell size={16} /> : <BellOff size={16} />} {soundOn ? "Sound on" : "Sound off"}
          </button>
          <button className="cr-tool" onClick={() => setFitKey((k) => k + 1)}>
            <LocateFixed size={16} /> Show all
          </button>
          <button className="cr-tool" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />} {fullscreen ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </header>

      {error && <div className="cr-error">{error}</div>}

      <section className="cr-stats">
        <div className="cr-stat red"><span>{stats?.open ?? "–"}</span>Open alerts</div>
        <div className="cr-stat amber"><span>{stats?.byStatus.pending ?? "–"}</span>Waiting for a responder</div>
        <div className="cr-stat blue"><span>{stats ? stats.byStatus.accepted + stats.byStatus.en_route : "–"}</span>Help on the way</div>
        <div className="cr-stat green"><span>{stats?.resolvedToday ?? "–"}</span>Resolved (24 h)</div>
        <div className="cr-stat"><span>{stats?.freeBeds ?? "–"}</span>Free beds</div>
        <div className="cr-stat"><span>{stats?.freeIcu ?? "–"}</span>Free ICU beds</div>
        <div className="cr-stat"><span>{stats?.ambulances ?? "–"}</span>Ambulances ready</div>
        <div className="cr-stat"><span>{stats ? `${stats.withBeds}/${stats.hospitals}` : "–"}</span>Hospitals with beds</div>
      </section>

      <div className="cr-main">
        <div className="cr-map">
          <MapContainer center={INDIA_CENTER} zoom={5} style={{ height: "100%", width: "100%" }} zoomControl>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitToData points={points} trigger={fitKey} />
            <FlyTo target={focus} />

            {data?.safetyChecks.map((check) => (
              <Circle
                key={check._id}
                center={toLatLng(check.center)}
                radius={check.radiusKm * 1000}
                pathOptions={{ color: "#f59e0b", weight: 2, dashArray: "8 6", fillColor: "#f59e0b", fillOpacity: 0.08 }}
              >
                <Popup>
                  <strong>{KIND_ICON[check.kind]} {check.title}</strong>
                  <br />
                  Safety Check · {check.radiusKm} km radius
                  <br />
                  {check.counts.safe} safe · {check.counts.need_help} need help
                </Popup>
              </Circle>
            ))}

            {data?.hospitals.map((h) => (
              <Marker key={h._id} position={toLatLng(h.coordinates)} icon={hospitalIcon(bedLevel(h))}>
                <Popup>
                  <strong>{h.name}</strong>
                  <br />
                  Beds: {h.availableBeds} free{h.totalBeds ? ` of ${h.totalBeds}` : ""} · ICU: {h.icuAvailableBeds} free
                  <br />
                  Ambulances: {h.ambulances} · Blood units: {h.bloodUnits}
                </Popup>
              </Marker>
            ))}

            {data?.alerts.map((a) => (
              <Marker key={a._id} position={toLatLng(a.coordinates)} icon={alertIcon(a.status, fresh.includes(a._id))} zIndexOffset={1000}>
                <Popup>
                  <strong>{TYPE[a.type]?.label || a.type} emergency</strong>
                  <br />
                  {STATUS[a.status]} · {minutesAgo(a.createdAt, now)}
                  <br />
                  Alerted: {a.targets.map((target) => TARGET[target]).join(", ")}
                  {a.etaMinutes ? <><br />ETA {a.etaMinutes} min</> : null}
                  <div style={{ marginTop: 8 }}>
                    <MapsLink coordinates={a.coordinates} />
                  </div>
                </Popup>
              </Marker>
            ))}

            {data?.alerts
              .filter((a) => a.responderCoordinates)
              .map((a) => (
                <Fragment key={`r-${a._id}`}>
                  <Marker position={toLatLng(a.responderCoordinates)} icon={responderIcon} />
                  <Polyline positions={[toLatLng(a.responderCoordinates), toLatLng(a.coordinates)]} pathOptions={{ color: "#38bdf8", weight: 2, dashArray: "4 6" }} />
                </Fragment>
              ))}
          </MapContainer>

          <div className="cr-legend">
            <span><i className="cr-dot pending" /> Waiting</span>
            <span><i className="cr-dot accepted" /> Accepted</span>
            <span><i className="cr-dot en_route" /> En route</span>
            <span><i className="cr-sq ok" /> Beds free</span>
            <span><i className="cr-sq low" /> Few beds</span>
            <span><i className="cr-sq full" /> Full</span>
            <span><i className="cr-ring" /> Safety Check area</span>
          </div>
          {toast && (
            <div className="cr-toast" role="alert">
              <Siren size={18} /> {toast}
            </div>
          )}
        </div>

        <aside className="cr-feed">
          <h2>Live feed</h2>
          {!data && <p className="cr-muted">Loading…</p>}
          {data?.alerts.length === 0 && <p className="cr-muted">No open alerts right now. All quiet.</p>}
          <ul>
            {data?.alerts.map((a) => {
              const Icon = TYPE[a.type]?.icon || CircleHelp;
              return (
                <li key={a._id} className={fresh.includes(a._id) ? "fresh" : ""}>
                  <button onClick={() => setFocus({ position: toLatLng(a.coordinates), at: Date.now() })}>
                    <span className={`cr-feed-icon ${a.status}`}><Icon size={16} /></span>
                    <span className="cr-feed-text">
                      <strong>{TYPE[a.type]?.label || a.type}</strong>
                      <small>{a.targets.map((target) => TARGET[target]).join(" · ")} · {minutesAgo(a.createdAt, now)}</small>
                    </span>
                    <span className={`cr-status ${a.status}`}>{STATUS[a.status]}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {data?.safetyChecks.length > 0 && (
            <>
              <h2>Safety Checks</h2>
              <ul>
                {data.safetyChecks.map((check) => (
                  <li key={check._id}>
                    <button onClick={() => setFocus({ position: toLatLng(check.center), at: Date.now() })}>
                      <span className="cr-feed-icon check">{KIND_ICON[check.kind]}</span>
                      <span className="cr-feed-text">
                        <strong>{check.title}</strong>
                        <small>{check.counts.safe} safe · {check.counts.need_help} need help · {check.counts.not_in_area} not in area</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export default ControlRoom;
