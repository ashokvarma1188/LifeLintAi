const toRad = (deg) => (deg * Math.PI) / 180;

/** Straight-line distance in km between two [longitude, latitude] points. */
const distanceKm = ([lng1, lat1], [lng2, lat2]) => {
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Reads latitude/longitude from a request body or query; returns [lng, lat] or null. */
const readPoint = (source) => {
  const latitude = Number(source?.latitude);
  const longitude = Number(source?.longitude);
  if (source?.latitude === undefined || source?.longitude === undefined || source.latitude === "" || source.longitude === "") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return [longitude, latitude];
};

module.exports = { distanceKm, readPoint };
