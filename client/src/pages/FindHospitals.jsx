import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import AppNavbar from "./AppNavbar";
import MapsLink from "../components/MapsLink";
import { SkeletonCards } from "../components/Skeleton";
import { IconMapPin, IconPhone, IconHospital } from "./icons";
import "./Dashboard.css";
import "./FindHospitals.css";
import { useLang } from "../i18n/context";

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

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

function FindHospitals() {
  const { t } = useLang();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(navigator.geolocation));
  const [error, setError] = useState(() => (navigator.geolocation ? "" : "Location is not supported on this device/browser."));
  const [coords, setCoords] = useState(null);
  const [bloodGroup, setBloodGroup] = useState("");

  // State updates only happen in the geolocation/API callbacks, so this is safe to run on mount.
  const locate = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });

        try {
          const res = await api.get("/hospitals/nearby", {
            params: { longitude, latitude },
          });
          setHospitals(res.data);
          setError("");
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

  const search = () => {
    if (!navigator.geolocation) return;
    setError("");
    setLoading(true);
    locate();
  };

  useEffect(() => {
    locate();
  }, [locate]);

  // Blood groups this hospital has units of, in the usual order.
  const stockOf = (h) => BLOOD_GROUPS.map((g) => [g, Number(h.bloodStock?.[g]) || 0]).filter(([, units]) => units > 0);
  const visible = bloodGroup ? hospitals.filter((h) => (Number(h.bloodStock?.[bloodGroup]) || 0) > 0) : hospitals;

  return (
    <div className="dash-wrapper">
      <AppNavbar showLogout />

      <div className="fh-content">
        <div className="fh-header">
          <h1>{t("Nearby Hospitals")}</h1>
          <p>{t("Nearest hospitals to your current location.")}</p>
        </div>

        <div className="fh-search-bar">
          <span className="status-text">
            {loading ? t("Searching nearby hospitals...") : error ? t(error) : t("{count} hospital(s) found", { count: hospitals.length })}
          </span>
          <button className="fh-refresh-btn" onClick={search} disabled={loading}>
            {loading ? t("Searching...") : t("Refresh")}
          </button>
        </div>

        <div className="fh-blood-filter">
          <span>{t("Need blood?")}</span>
          <button className={`fh-chip${bloodGroup === "" ? " active" : ""}`} onClick={() => setBloodGroup("")}>
            {t("All hospitals")}
          </button>
          {BLOOD_GROUPS.map((g) => (
            <button key={g} className={`fh-chip${bloodGroup === g ? " active" : ""}`} onClick={() => setBloodGroup(g)}>
              {g}
            </button>
          ))}
        </div>

        {bloodGroup && !loading && visible.length === 0 && (
          <div className="fh-empty">
            <p>{t("No nearby hospital has {group} blood in stock right now. Try Blood Donation to reach donors.", { group: bloodGroup })}</p>
          </div>
        )}

        {loading && hospitals.length === 0 && <SkeletonCards count={3} />}

        {!loading && hospitals.length === 0 && !error && (
          <div className="fh-empty">
            <div className="icon-wrap">
              <IconHospital width={24} height={24} />
            </div>
            <p>{t("No hospitals found nearby yet.")}</p>
          </div>
        )}

        <div className="fh-list">
          {visible.map((h) => {
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
                      {h.address || t("Address not available")}
                      {distance !== null && <span className="fh-distance"> · {t("{km} km away", { km: distance.toFixed(1) })}</span>}
                    </div>
                    <div className="fh-card-row">
                      <IconPhone width={14} height={14} />
                      {h.phone ? (
                        <a href={`tel:${h.phone}`} style={{ color: "inherit" }}>{h.phone}</a>
                      ) : (
                        t("Not available")
                      )}
                    </div>
                  </div>
                </div>
                <div className="fh-card-side">
                  <div className="fh-beds">
                    <strong>{h.availableBeds ?? "-"}</strong> / {h.totalBeds ?? "-"} {t("beds free")}
                  </div>
                  {h.icuBeds > 0 && (
                    <div className="fh-beds" style={{ marginTop: 2 }}>
                      <strong>{h.icuAvailableBeds ?? 0}</strong> / {h.icuBeds} {t("ICU beds free")}
                    </div>
                  )}
                  <span className={`fh-ambulance ${h.ambulanceAvailable ? "available" : "unavailable"}`}>
                    {h.ambulanceAvailable
                      ? `${t("Ambulance available")}${h.ambulanceCount ? ` (${h.ambulanceCount})` : ""}`
                      : t("No ambulance")}
                  </span>
                  <span className={`fh-ambulance ${h.bloodBankAvailable ? "available" : "unavailable"}`} style={{ marginTop: 6 }}>
                    {h.bloodBankAvailable ? t("Blood bank available") : t("No blood bank")}
                  </span>
                  <span className={`fh-ambulance ${h.oxygenAvailable ? "available" : "unavailable"}`} style={{ marginTop: 6 }}>
                    {h.oxygenAvailable ? t("Oxygen available") : t("No oxygen")}
                  </span>
                  {stockOf(h).length > 0 && (
                    <div className="fh-stock">
                      {stockOf(h).map(([g, units]) => (
                        <span key={g} className={`fh-stock-chip${g === bloodGroup ? " match" : ""}`}>
                          {g} · {units}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <MapsLink coordinates={h.location?.coordinates} />
                  </div>
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
