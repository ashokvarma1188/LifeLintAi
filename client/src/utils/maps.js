/** Opens Google Maps with turn-by-turn directions to the given point. */
export function googleMapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
