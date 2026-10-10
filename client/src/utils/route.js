/*
 * Road route between two points from the public OSRM router (OpenStreetMap data, no key).
 * Points are GeoJSON [lng, lat]. Returns { coords: [[lat, lng], …], km, minutes } — or
 * throws, in which case callers fall back to the straight-line estimate.
 */
const OSRM = "https://router.project-osrm.org/route/v1/driving";

export async function fetchRoute(from, to) {
  const url = `${OSRM}/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route) throw new Error("No road route found");
  return {
    coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    km: route.distance / 1000,
    minutes: Math.max(1, Math.round(route.duration / 60)),
  };
}
