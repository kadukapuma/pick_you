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

const directionsCache = new Map<
  string,
  { data: DirectionsResult; timestamp: number }
>();
const directionsInFlight = new Map<string, Promise<DirectionsResult | null>>();
const CACHE_TTL = 5 * 60 * 1000;
const ROUTE_REQUEST_TIMEOUT_MS = 5500;
const FALLBACK_ROAD_DISTANCE_FACTOR = 1.28;

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

  return {
    isFallback: false,
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

  console.log("Google route request failed:", response.message);
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

export const getCachedDirections_withCache = async (
  pickupLat: number,
  pickupLon: number,
  destinationLat: number,
  destinationLon: number,
): Promise<DirectionsResult | null> => {
  const key = `${pickupLat.toFixed(5)},${pickupLon.toFixed(5)}-${destinationLat.toFixed(5)},${destinationLon.toFixed(5)}`;
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

export const clearDirectionsCache = (): void => {
  directionsCache.clear();
};
