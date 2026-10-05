import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppNavbar from "./AppNavbar";
import { IconMapPin, IconPhone, IconHospital } from "./icons";
import { listNearbyServices } from "../services/emergencyServices";
import { getErrorMessage } from "../services/api";
import "./Dashboard.css";
import "./FindHospitals.css";

// Haversine formula: calculates straight-line distance (in km) between two lat/lng points
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TYPES = [
  { value: "police", label: "Police" },
  { value: "firestation", label: "Fire Station" },
];

function FindEmergencyServices() {
  const navigate = useNavigate();
  const [type, setType] = useState("police");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);

  const search = useCallback((selectedType) => {
    setError("");
    setLoading(true);

    if (!navigator.geolocation) {
      setError("Location is not supported on this device/browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });

        try {
          const data = await listNearbyServices({ latitude, longitude, role: selectedType });
          setServices(data);
        } catch (err) {
          setError(getErrorMessage(err, "Failed to load nearby services."));
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location access denied. Please allow location to search nearby services.");
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    (async () => {
      search(type);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <div className="dash-wrapper">
      <AppNavbar showLogout />

      <div className="fh-content">
        <button className="portal-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={14} /> Back to dashboard
        </button>

        <div className="fh-header">
          <h1>Nearby Police &amp; Fire Stations</h1>
          <p>Registered stations within 25 km of your current location, closest first.</p>
        </div>

        <div className="portal-toolbar" style={{ marginBottom: 16 }}>
          {TYPES.map((t) => (
            <button
              key={t.value}
              className={`portal-btn ${type === t.value ? "primary" : "ghost"}`}
              onClick={() => setType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="fh-search-bar">
          <span className="status-text">
            {loading ? "Searching nearby…" : error || `${services.length} found`}
          </span>
          <button className="fh-refresh-btn" onClick={() => search(type)} disabled={loading}>
            {loading ? "Searching..." : "Refresh"}
          </button>
        </div>

        {!loading && services.length === 0 && !error && (
          <div className="fh-empty">
            <div className="icon-wrap">
              <IconHospital width={24} height={24} />
            </div>
            <p>No {type === "police" ? "police stations" : "fire stations"} registered yet.</p>
          </div>
        )}

        <div className="fh-list">
          {services.map((s) => {
            const [lng, lat] = s.location?.coordinates || [];
            const distance =
              coords && lat != null ? getDistanceKm(coords.latitude, coords.longitude, lat, lng) : null;

            return (
              <div className="fh-card" key={s._id}>
                <div className="fh-card-main">
                  <div className="fh-card-icon">
                    <IconHospital width={20} height={20} />
                  </div>
                  <div>
                    <h3>{s.orgName || s.name}</h3>
                    <div className="fh-card-row">
                      <IconMapPin width={14} height={14} />
                      {distance !== null ? `${distance.toFixed(1)} km away` : "Distance unavailable"}
                    </div>
                    <div className="fh-card-row">
                      <IconPhone width={14} height={14} />
                      {s.phone ? (
                        <a href={`tel:${s.phone}`} style={{ color: "inherit" }}>{s.phone}</a>
                      ) : (
                        "Not available"
                      )}
                    </div>
                  </div>
                </div>
                <div className="fh-card-side">
                  <span className={`fh-ambulance ${s.isOpen !== false ? "available" : "unavailable"}`}>
                    {s.isOpen !== false ? "Open" : "Closed"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FindEmergencyServices;
