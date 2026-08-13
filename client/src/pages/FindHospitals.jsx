import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import AppNavbar from "./AppNavbar";
import { IconMapPin, IconPhone, IconHospital } from "./icons";
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

function FindHospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);

  const search = useCallback(() => {
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
          const res = await api.get("/hospitals/nearby", {
            params: { longitude, latitude },
          });
          setHospitals(res.data);
        } catch (err) {
          setError(err.response?.data?.message || "Failed to load hospitals.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location access denied. Please allow location to search nearby hospitals.");
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    search();
  }, [search]);

  return (
    <div className="dash-wrapper">
      <AppNavbar showLogout />

      <div className="fh-content">
        <div className="fh-header">
          <h1>Nearby Hospitals</h1>
          <p>Hospitals within 10 km of your current location, closest first.</p>
        </div>

        <div className="fh-search-bar">
          <span className="status-text">
            {loading ? "Searching nearby hospitals..." : error || `${hospitals.length} hospital(s) found`}
          </span>
          <button className="fh-refresh-btn" onClick={search} disabled={loading}>
            {loading ? "Searching..." : "Refresh"}
          </button>
        </div>

        {!loading && hospitals.length === 0 && !error && (
          <div className="fh-empty">
            <div className="icon-wrap">
              <IconHospital width={24} height={24} />
            </div>
            <p>No hospitals found nearby yet.</p>
          </div>
        )}

        <div className="fh-list">
          {hospitals.map((h) => {
            const [lng, lat] = h.location?.coordinates || [];
            const distance =
              coords && lat != null ? getDistanceKm(coords.latitude, coords.longitude, lat, lng) : null;

            return (
              <div className="fh-card" key={h._id}>
                <div className="fh-card-main">
                  <div className="fh-card-icon">
                    <IconHospital width={20} height={20} />
                  </div>
                  <div>
                    <h3>{h.name}</h3>
                    <div className="fh-card-row">
                      <IconMapPin width={14} height={14} />
                      {h.address || "Address not available"}
                      {distance !== null && <span className="fh-distance"> · {distance.toFixed(1)} km away</span>}
                    </div>
                    <div className="fh-card-row">
                      <IconPhone width={14} height={14} />
                      {h.phone || "Not available"}
                    </div>
                  </div>
                </div>
                <div className="fh-card-side">
                  <div className="fh-beds">
                    <strong>{h.availableBeds ?? "-"}</strong> / {h.totalBeds ?? "-"} beds free
                  </div>
                  <span className={`fh-ambulance ${h.ambulanceAvailable ? "available" : "unavailable"}`}>
                    {h.ambulanceAvailable ? "Ambulance available" : "No ambulance"}
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

export default FindHospitals;
