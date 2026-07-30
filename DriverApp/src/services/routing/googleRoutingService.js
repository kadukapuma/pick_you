import api from "../api";

const directionsCache = new Map();
const directionsInFlight = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const ROUTE_TIMEOUT_MS = 6000;

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

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const durationSeconds = (value) => {
  if (typeof value === "string" && value.endsWith("s")) {
    return Math.max(0, Math.round(Number(value.slice(0, -1)) || 0));
  }
  const number = toNumber(value);
  return number == null ? null : Math.max(0, Math.round(number));
};

const decodePolyline = (encoded = "") => {
  const coordinates = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
};

const readEncodedPolyline = (polyline) => {
  if (typeof polyline === "string") return polyline;
  return polyline?.encodedPolyline || polyline?.encoded_polyline || "";
};

const normalizePolyline = (polyline, steps, fallbackPolyline) => {
  if (Array.isArray(polyline) && polyline.length > 1) return polyline;

  const encodedPolyline = readEncodedPolyline(polyline);
  if (encodedPolyline) {
    const decoded = decodePolyline(encodedPolyline);
    if (decoded.length > 1) return decoded;
  }

  const stepPolyline = steps.flatMap((step) => step.polyline || []);
  if (stepPolyline.length > 1) return stepPolyline;

  return fallbackPolyline;
};

export const fallbackRoute = (pickupLat, pickupLon, destinationLat, destinationLon) => {
  const latScale = 111320;
  const lngScale =
    latScale * Math.cos(((pickupLat + destinationLat) / 2) * Math.PI / 180);
  const distance = Math.hypot(
    (destinationLat - pickupLat) * latScale,
    (destinationLon - pickupLon) * lngScale,
  );
  const duration = Math.max(60, Math.round((distance / 35000) * 3600));

  return {
    isFallback: true,
    distance,
    duration,
    polyline: [
      { latitude: pickupLat, longitude: pickupLon },
      { latitude: destinationLat, longitude: destinationLon },
    ],
    distanceText: formatDistance(distance),
    durationText: formatDuration(duration),
    steps: [],
    currentStep: null,
  };
};

const normalizeStep = (step) => {
  if (!step) return null;

  const instruction =
    step.instruction ||
    step.instructions ||
    step.navigationInstruction?.instructions ||
    step.navigation_instruction?.instructions ||
    "";

  if (!instruction) return null;

  const distance =
    toNumber(step.distance) ??
    toNumber(step.distanceMeters) ??
    toNumber(step.distance_meters) ??
    0;
  const duration =
    durationSeconds(step.duration) ??
    durationSeconds(step.durationSeconds) ??
    durationSeconds(step.duration_seconds) ??
    durationSeconds(step.staticDuration) ??
    durationSeconds(step.static_duration) ??
    0;

  return {
    distance,
    distanceText:
      step.distanceText ||
      step.distance_text ||
      formatDistance(distance),
    duration,
    durationText:
      step.durationText ||
      step.duration_text ||
      formatDuration(duration),
    instruction,
    maneuver:
      step.maneuver ||
      step.navigationInstruction?.maneuver ||
      step.navigation_instruction?.maneuver ||
      null,
    polyline: normalizePolyline(step.polyline, [], []),
  };
};

const normalizeDirections = (
  value,
  pickupLat,
  pickupLon,
  destinationLat,
  destinationLon,
) => {
  const fallback = fallbackRoute(pickupLat, pickupLon, destinationLat, destinationLon);
  const route = value?.route || value || {};
  const distance =
    toNumber(route.distance) ??
    toNumber(route.distanceMeters) ??
    toNumber(route.distance_meters) ??
    (toNumber(route.distanceKm) != null ? toNumber(route.distanceKm) * 1000 : null) ??
    (toNumber(route.distance_km) != null ? toNumber(route.distance_km) * 1000 : null) ??
    fallback.distance;
  const duration =
    durationSeconds(route.duration) ??
    durationSeconds(route.durationSeconds) ??
    durationSeconds(route.duration_seconds) ??
    fallback.duration;
  const rawPolyline =
    route.polyline ||
    route.coordinates ||
    route.routeCoordinates ||
    route.route_coordinates;
  const steps = Array.isArray(route.steps)
    ? route.steps.map(normalizeStep).filter(Boolean)
    : [];
  const currentStep = normalizeStep(route.currentStep || route.current_step) || steps[0] || null;
  const polyline = normalizePolyline(rawPolyline, steps, fallback.polyline);

  return {
    isFallback: false,
    distance,
    duration,
    polyline,
    distanceText:
      route.distanceText ||
      route.distance_text ||
      formatDistance(distance),
    durationText:
      route.durationText ||
      route.duration_text ||
      formatDuration(duration),
    steps,
    currentStep,
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
    }, {
      timeout: ROUTE_TIMEOUT_MS,
    });

    return normalizeDirections(
      response.data?.data ?? response.data ?? null,
      pickupLat,
      pickupLon,
      destinationLat,
      destinationLon,
    );
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
  const key = `v2:${pickupLat.toFixed(5)},${pickupLon.toFixed(5)}-${destinationLat.toFixed(5)},${destinationLon.toFixed(5)}`;
  const cached = getCachedDirections(key);
  if (cached) return cached;

  const pending = directionsInFlight.get(key);
  if (pending) return pending;

  const pendingRequest = getDirections(
    pickupLat,
    pickupLon,
    destinationLat,
    destinationLon,
  ).finally(() => {
    directionsInFlight.delete(key);
  });

  directionsInFlight.set(key, pendingRequest);
  const directions = await pendingRequest;

  if (directions && !directions.isFallback) {
    directionsCache.set(key, { data: directions, timestamp: Date.now() });
  }

  return directions;
};

export const clearDirectionsCache = () => {
  directionsCache.clear();
};
