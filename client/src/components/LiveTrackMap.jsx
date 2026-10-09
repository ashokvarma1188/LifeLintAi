import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "./LiveTrackMap.css";

/* Vite doesn't resolve Leaflet's default marker image paths, so point them at the bundled assets. */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const RESPONDER_EMOJI = { hospital: "🚑", police: "🚓", firestation: "🚒" };

const responderIcon = (role) =>
  L.divIcon({
    className: "ltm-responder-icon",
    html: `<span>${RESPONDER_EMOJI[role] || "🚑"}</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

/** Keeps both markers in view as the responder moves. */
function FitBoth({ points }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

/** `you` and `responder` are GeoJSON [lng, lat] pairs; `responder` is optional until someone accepts. */
function LiveTrackMap({ you, responder, responderRole, responderName, youLabel = "You" }) {
  const youLatLng = [you[1], you[0]];
  const responderLatLng = responder ? [responder[1], responder[0]] : null;

  return (
    <div className="ltm-wrap">
      <MapContainer center={youLatLng} zoom={14} style={{ height: "100%", width: "100%" }}>
        <FitBoth points={responderLatLng ? [youLatLng, responderLatLng] : [youLatLng, youLatLng]} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={youLatLng}>
          <Popup>{youLabel}</Popup>
        </Marker>
        {responderLatLng && (
          <Marker position={responderLatLng} icon={responderIcon(responderRole)}>
            <Popup>{responderName || "Responder"}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export default LiveTrackMap;
