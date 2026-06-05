/**
 * Mapbox Directions API — same pattern as PassengerApp.
 * Set EXPO_PUBLIC_MAPBOX_API_KEY in DriverApp/.env
 */

const MAPBOX_API_KEY = process.env.EXPO_PUBLIC_MAPBOX_API_KEY || "";

const decodePolyline = (encoded) => {
  const coords = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coords.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return coords;
};

const formatDistance = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

const formatDuration = (seconds) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "< 1 min";
  if (minutes === 1) return "1 min";
  return `${minutes} mins`;
};

export const getDirections = async (
  pickupLat,
  pickupLon,
  destinationLat,
  destinationLon,
) => {
  try {
    if (!MAPBOX_API_KEY) {
      console.error(
        "Mapbox API key not configured. Add EXPO_PUBLIC_MAPBOX_API_KEY to DriverApp/.env",
      );
      return null;
    }

    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${pickupLon},${pickupLat};${destinationLon},${destinationLat}` +
      `?access_token=${MAPBOX_API_KEY}&geometries=polyline&overview=full&exclude=toll`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.warn("No routes found from Mapbox");
      return null;
    }

    const route = data.routes[0];
    const distance = route.distance;
    const duration = route.duration;
    const polyline = decodePolyline(route.geometry);

    return {
      distance,
      duration,
      polyline,
      distanceText: formatDistance(distance),
      durationText: formatDuration(duration),
    };
  } catch (error) {
    console.error("Error fetching directions from Mapbox:", error);
    return null;
  }
};

const directionsCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

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
  if (cached) {
    return cached;
  }

  const directions = await getDirections(
    pickupLat,
    pickupLon,
    destinationLat,
    destinationLon,
  );

  if (directions) {
    directionsCache.set(key, {
      data: directions,
      timestamp: Date.now(),
    });
  }

  return directions;
};

export const isMapboxConfigured = () => Boolean(MAPBOX_API_KEY);
