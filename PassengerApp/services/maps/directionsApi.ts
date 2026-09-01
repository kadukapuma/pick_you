import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../api/client";

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface DirectionsResult {
  distance: number;
  duration: number;
  polyline: RouteCoordinate[];
  distanceText: string;
  durationText: string;
  isFallback?: boolean;
}

type CacheEntry = { data: DirectionsResult; timestamp: number };

const directionsCache = new Map<string, CacheEntry>();
const directionsInFlight = new Map<string, Promise<DirectionsResult | null>>();
// Routing is TRAFFIC_UNAWARE server-side, so route geometry between two
// fixed points is effectively static - safe to trust for a long time, and
// safe to persist across restarts, now that only genuine (non-fallback)
// routes ever reach this cache.
const CACHE_TTL = 24 * 60 * 60 * 1000;
const ROUTE_REQUEST_TIMEOUT_MS = 5500;
const ROUTE_MAX_ATTEMPTS = 2;
const ROUTE_RETRY_DELAY_MS = 350;
const FALLBACK_ROAD_DISTANCE_FACTOR = 1.28;

const PERSIST_STORAGE_KEY = "picku:directions-cache:v1";
const MAX_PERSISTED_ROUTES = 150;
const PERSIST_DEBOUNCE_MS = 500;

let persistTimeout: ReturnType<typeof setTimeout> | null = null;

const prunedEntries = (): [string, CacheEntry][] => {
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

let hydrationReady: Promise<void> | null = null;

const hydrateCache = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(PERSIST_STORAGE_KEY);
    if (!raw) return;

    const entries = JSON.parse(raw) as [string, CacheEntry][];
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

const ensureHydrated = (): Promise<void> => {
  if (!hydrationReady) hydrationReady = hydrateCache();
  return hydrationReady;
};

void ensureHydrated();

export const formatDistance = (meters: number): string => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "< 1 min";
  if (minutes === 1) return "1 min";
  return `${minutes} mins`;
};

export const fallbackRoute = (
  pickupLat: number,
  pickupLon: number,
  destinationLat: number,
  destinationLon: number,
): DirectionsResult => {
  const latScale = 111320;
  const lngScale =
    latScale * Math.cos(((pickupLat + destinationLat) / 2) * Math.PI / 180);
  const straightLineDistance = Math.hypot(
    (destinationLat - pickupLat) * latScale,
    (destinationLon - pickupLon) * lngScale,
  );
  const distance = straightLineDistance * FALLBACK_ROAD_DISTANCE_FACTOR;
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
  };
};


const normalizeDirections = (
  value: any,
  pickupLat: number,
  pickupLon: number,
  destinationLat: number,
  destinationLon: number,
): DirectionsResult => {
  const fallback = fallbackRoute(pickupLat, pickupLon, destinationLat, destinationLon);
  const route = value?.route || value;
  const distance = Number(
    route?.distance_meters ??
      route?.distanceMeters ??
      (route?.distance_km != null ? Number(route.distance_km) * 1000 : undefined) ??
      (route?.distanceKm != null ? Number(route.distanceKm) * 1000 : undefined) ??
      route?.distance ??
      fallback.distance,
  );
  const duration = Number(route?.duration ?? route?.duration_seconds ?? route?.durationSeconds ?? fallback.duration);
  const polyline =
    route?.polyline ||
    route?.coordinates ||
    route?.route_coordinates ||
    route?.routeCoordinates ||
    fallback.polyline;
  // The backend falls back to a straight line itself (bad/missing API key,
  // quota, no route found) and still answers with 200 success - without
  // honoring this flag we'd cache that disguised straight line as a real
  // route for 5 minutes.
  const isBackendFallback = route?.isFallback === true || route?.is_fallback === true;

  return {
    isFallback: isBackendFallback,
    distance: Number.isFinite(distance) ? distance : fallback.distance,
    duration: Number.isFinite(duration) ? duration : fallback.duration,
    polyline: Array.isArray(polyline) && polyline.length > 1 ? polyline : fallback.polyline,
    distanceText:
      route?.distanceText ||
      route?.distance_text ||
      formatDistance(Number.isFinite(distance) ? distance : fallback.distance),
    durationText:
      route?.durationText ||
      route?.duration_text ||
      formatDuration(Number.isFinite(duration) ? duration : fallback.duration),
  };
};
export const getDirections = async (
  pickupLat: number,
  pickupLon: number,
  destinationLat: number,
  destinationLon: number,
): Promise<DirectionsResult | null> => {
  let lastMessage: string | undefined;

  for (let attempt = 1; attempt <= ROUTE_MAX_ATTEMPTS; attempt++) {
    const response = await apiClient.post<DirectionsResult>("/maps/routes", {
      origin: { latitude: pickupLat, longitude: pickupLon },
      destination: { latitude: destinationLat, longitude: destinationLon },
    }, {
      suppressErrorLog: true,
      timeoutMs: ROUTE_REQUEST_TIMEOUT_MS,
    });

    if (response.success && response.data) {
      return normalizeDirections(
        response.data,
        pickupLat,
        pickupLon,
        destinationLat,
        destinationLon,
      );
    }

    lastMessage = response.message;
    if (attempt < ROUTE_MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, ROUTE_RETRY_DELAY_MS));
    }
  }

  console.log("Google route request failed:", lastMessage);
  return fallbackRoute(pickupLat, pickupLon, destinationLat, destinationLon);
};

const getCachedDirections = (key: string): DirectionsResult | null => {
  const cached = directionsCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL) {
    directionsCache.delete(key);
    return null;
  }

  return cached.data;
};

export const peekCachedDirections = (
  pickupLat: number,
  pickupLon: number,
  destinationLat: number,
  destinationLon: number,
): DirectionsResult | null => {
  const key = `${pickupLat.toFixed(5)},${pickupLon.toFixed(5)}-${destinationLat.toFixed(5)},${destinationLon.toFixed(5)}`;
  return getCachedDirections(key);
};

export const getCachedDirections_withCache = async (
  pickupLat: number,
  pickupLon: number,
  destinationLat: number,
  destinationLon: number,
): Promise<DirectionsResult | null> => {
  const key = `${pickupLat.toFixed(5)},${pickupLon.toFixed(5)}-${destinationLat.toFixed(5)},${destinationLon.toFixed(5)}`;
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

export const clearDirectionsCache = (): void => {
  directionsCache.clear();
  if (persistTimeout) {
    clearTimeout(persistTimeout);
    persistTimeout = null;
  }
  AsyncStorage.removeItem(PERSIST_STORAGE_KEY).catch(() => {
    // Non-critical - a failed removal just leaves stale data to expire via TTL.
  });
};
