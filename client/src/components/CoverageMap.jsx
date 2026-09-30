import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import MapsLink from "./MapsLink";

/* Vite doesn't resolve Leaflet's default marker image paths, so point them at the bundled assets. */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const INDIA_CENTER = [20.5937, 78.9629];

/** `alerts` are EmergencyRequest documents with a GeoJSON `location.coordinates` [lng, lat]. */
function CoverageMap({ alerts }) {
  const withCoords = alerts.filter((a) => a.location?.coordinates?.length === 2);
  const center = withCoords.length
    ? [withCoords[0].location.coordinates[1], withCoords[0].location.coordinates[0]]
    : INDIA_CENTER;

  return (
    <div>
      <div style={{ height: 460, borderRadius: 12, overflow: "hidden" }}>
        <MapContainer center={center} zoom={withCoords.length ? 12 : 5} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {withCoords.map((a) => (
            <Marker key={a._id} position={[a.location.coordinates[1], a.location.coordinates[0]]}>
              <Popup>
                <strong>{a.citizenId?.name || "Unknown"}</strong>
                <br />
                Type: {a.type}
                <br />
                Status: {a.status}
                <br />
                {a.citizenId?.phone && (
                  <>
                    Phone: {a.citizenId.phone}
                    <br />
                  </>
                )}
                <div style={{ marginTop: 6 }}>
                  <MapsLink coordinates={a.location.coordinates} />
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {withCoords.length === 0 && (
        <p style={{ textAlign: "center", marginTop: 10, color: "var(--text-secondary)" }}>
          No active alerts with a location right now — showing a default view of India.
        </p>
      )}
    </div>
  );
}

export default CoverageMap;
