import { Navigation } from "lucide-react";
import { googleMapsDirectionsUrl } from "../utils/maps";

/** `coordinates` is GeoJSON [lng, lat], as stored on EmergencyRequest.location. */
function MapsLink({ coordinates, className = "portal-btn ghost small" }) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [lng, lat] = coordinates;

  return (
    <a
      className={className}
      href={googleMapsDirectionsUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      title="Open directions in Google Maps"
    >
      <Navigation size={13} /> Directions
    </a>
  );
}

export default MapsLink;
