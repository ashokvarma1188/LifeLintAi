// Converts a plain-text address into { latitude, longitude } using Nominatim
// (a free, open-source geocoding service built on OpenStreetMap). No API key needed.
const geocodeAddress = async (address) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "LifeLinkAI-CapstoneProject/1.0",
    },
  });

  if (!response.ok) {
    throw new Error("Geocoding service failed. Please try again.");
  }

  const results = await response.json();

  if (!results.length) {
    throw new Error("Address not found. Please enter a more specific address.");
  }

  return {
    latitude: parseFloat(results[0].lat),
    longitude: parseFloat(results[0].lon),
  };
};

module.exports = geocodeAddress;
