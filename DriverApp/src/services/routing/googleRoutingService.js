import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api";

const directionsCache = new Map();
const directionsInFlight = new Map();
// Routing is TRAFFIC_UNAWARE server-side, so route geometry between two
// fixed points is effectively static - safe to trust for a long time, and
// safe to persist across restarts, now that only genuine (non-fallback)
// routes ever reach this cache.
const CACHE_TTL = 24 * 60 * 60 * 1000;
const ROUTE_TIMEOUT_MS = 6000;
const ROUTE_MAX_ATTEMPTS = 2;
const ROUTE_RETRY_DELAY_MS = 350;

const PERSIST_STORAGE_KEY = "picku:directions-cache:v1";
const MAX_PERSISTED_ROUTES = 150;
const PERSIST_DEBOUNCE_MS = 500;

let persistTimeout = null;

const prunedEntries = () => {
  const now = Date.now();
  const fresh = Array.from(directionsCache.entries()).filter(
    ([, entry]) => now - entry.timestamp <= CACHE_TTL,
  );
  fresh.sort((a, b) => b[1].timestamp - a[1].timestamp);
  return fresh.slice(0, MAX_PERSISTED_ROUTES);
};

const schedulePersist = () => {
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    persistTimeout = null;
    const entries = prunedEntries();
    AsyncStorage.setItem(PERSIST_STORAGE_KEY, JSON.stringify(entries)).catch(() => {
      // Non-critical - a failed write just means no persisted cache this run.
    });
  }, PERSIST_DEBOUNCE_MS);
};

let hydrationReady = null;

const hydrateCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(PERSIST_STORAGE_KEY);
    if (!raw) return;

    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return;

    const now = Date.now();
    for (const [key, entry] of entries) {
      if (!entry || now - entry.timestamp > CACHE_TTL) continue;
      directionsCache.set(key, entry);
    }
  } catch {
    // Ignore corrupt/missing persisted cache - starts empty, same as today.
  }
};

const ensureHydrated = () => {
  if (!hydrationReady) hydrationReady = hydrateCache();
  return hydrationReady;
};

void ensureHydrated();

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
  // The backend falls back to a straight line itself (bad/missing API key,
  // quota, no route found) and still answers with 200 success - without
  // honoring this flag we'd cache that disguised straight line as a real
  // route for 5 minutes.
  const isBackendFallback = route.isFallback === true || route.is_fallback === true;

  return {
    isFallback: isBackendFallback,
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
  let lastError;

  for (let attempt = 1; attempt <= ROUTE_MAX_ATTEMPTS; attempt++) {
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
      lastError = error;
      if (attempt < ROUTE_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, ROUTE_RETRY_DELAY_MS));
      }
    }
  }

  console.log("Google route request failed:", lastError?.response?.data || lastError);
  return fallbackRoute(pickupLat, pickupLon, destinationLat, destinationLon);
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

export const peekCachedDirections = (
  pickupLat,
  pickupLon,
  destinationLat,
  destinationLon,
) => {
  const key = `v2:${pickupLat.toFixed(5)},${pickupLon.toFixed(5)}-${destinationLat.toFixed(5)},${destinationLon.toFixed(5)}`;
  return getCachedDirections(key);
};

export const getCachedDirections_withCache = async (
  pickupLat,
  pickupLon,
  destinationLat,
  destinationLon,
) => {
  const key = `v2:${pickupLat.toFixed(5)},${pickupLon.toFixed(5)}-${destinationLat.toFixed(5)},${destinationLon.toFixed(5)}`;
  await ensureHydrated();
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
    schedulePersist();
  }

  return directions;
};

export const clearDirectionsCache = () => {
  directionsCache.clear();
  if (persistTimeout) {
    clearTimeout(persistTimeout);
    persistTimeout = null;
  }
  AsyncStorage.removeItem(PERSIST_STORAGE_KEY).catch(() => {
    // Non-critical - a failed removal just leaves stale data to expire via TTL.
  });
};
