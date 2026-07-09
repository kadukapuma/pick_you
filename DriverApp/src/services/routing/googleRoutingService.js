import api from "../api";

const directionsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const formatDistance = (meters) => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

const formatDuration = (seconds) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "< 1 min";
  if (minutes === 1) return "1 min";
  return `${minutes} mins`;
};

const fallbackRoute = (pickupLat, pickupLon, destinationLat, destinationLon) => {
  const latScale = 111320;
  const lngScale =
    latScale * Math.cos(((pickupLat + destinationLat) / 2) * Math.PI / 180);
  const distance = Math.hypot(
    (destinationLat - pickupLat) * latScale,
    (destinationLon - pickupLon) * lngScale,
  );
  const duration = Math.max(60, Math.round((distance / 35000) * 3600));

  return {
    distance,
    duration,
    polyline: [
      { latitude: pickupLat, longitude: pickupLon },
      { latitude: destinationLat, longitude: destinationLon },
    ],
    distanceText: formatDistance(distance),
    durationText: formatDuration(duration),
  };
};

export const getDirections = async (
  pickupLat,
  pickupLon,
  destinationLat,
  destinationLon,
) => {
  try {
    const response = await api.post("/maps/routes", {
      origin: { latitude: pickupLat, longitude: pickupLon },
      destination: { latitude: destinationLat, longitude: destinationLon },
    });

    return response.data?.data ?? response.data ?? null;
  } catch (error) {
    console.log("Google route request failed:", error.response?.data || error);
    return fallbackRoute(pickupLat, pickupLon, destinationLat, destinationLon);
  }
};

const getCachedDirections = (key) => {
  const cached = directionsCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    directionsCache.delete(key);
    return null;
  }

  return cached.data;
};

export const getCachedDirections_withCache = async (
  pickupLat,
  pickupLon,
  destinationLat,
  destinationLon,
) => {
  const key = `${pickupLat.toFixed(5)},${pickupLon.toFixed(5)}-${destinationLat.toFixed(5)},${destinationLon.toFixed(5)}`;
  const cached = getCachedDirections(key);
  if (cached) return cached;

  const directions = await getDirections(
    pickupLat,
    pickupLon,
    destinationLat,
    destinationLon,
  );

  if (directions) {
    directionsCache.set(key, { data: directions, timestamp: Date.now() });
  }

  return directions;
};

export const clearDirectionsCache = () => {
  directionsCache.clear();
};
