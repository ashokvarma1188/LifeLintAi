import { Navigation } from "lucide-react";
import { googleMapsDirectionsUrl } from "../utils/maps";
import { useLang } from "../i18n/context";

/** `coordinates` is GeoJSON [lng, lat], as stored on EmergencyRequest.location. */
function MapsLink({ coordinates, className = "portal-btn ghost small" }) {
  const { t } = useLang();
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const [lng, lat] = coordinates;

  return (
    <a
      className={className}
      href={googleMapsDirectionsUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      title={t("Open directions in Google Maps")}
    >
      <Navigation size={13} /> {t("Directions")}
    </a>
  );
}

export default MapsLink;
