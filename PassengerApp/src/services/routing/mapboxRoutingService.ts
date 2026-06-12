/**
 * Mapbox Directions API Service
 * Fetches actual routes that follow roads with real distance/duration
 */

const MAPBOX_API_KEY = process.env.EXPO_PUBLIC_MAPBOX_API_KEY;

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface DirectionsResult {
  distance: number; // in meters
  duration: number; // in seconds
  polyline: RouteCoordinate[]; // array of coordinates following the route
  distanceText: string; // formatted (e.g., "12.5 km")
  durationText: string; // formatted (e.g., "25 mins")
}

/**
 * Decode polyline from Mapbox response
 * Converts encoded polyline string to array of coordinates
 */
const decodePolyline = (encoded: string): RouteCoordinate[] => {
  const coords: RouteCoordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;

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

/**
 * Format distance in meters to human readable format
 */
const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

/**
 * Format duration in seconds to human readable format
 */
const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "< 1 min";
  if (minutes === 1) return "1 min";
  return `${minutes} mins`;
};

/**
 * Fetch directions from Mapbox Directions API
 * Uses driving profile to get realistic routes
 */
export const getDirections = async (
  pickupLat: number,
  pickupLon: number,
  destinationLat: number,
  destinationLon: number,
): Promise<DirectionsResult | null> => {
  try {
    if (!MAPBOX_API_KEY) {
      console.error("Mapbox API key not configured");
      return null;
    }

    // Mapbox Directions API endpoint
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLon},${pickupLat};${destinationLon},${destinationLat}?access_token=${MAPBOX_API_KEY}&geometries=polyline&overview=full&exclude=toll`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.warn("No routes found from Mapbox");
      return null;
    }

    const route = data.routes[0];
    const distance = route.distance; // in meters
    const duration = route.duration; // in seconds
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

/**
 * Cache for directions to reduce API calls
 */
const directionsCache = new Map<
  string,
  { data: DirectionsResult; timestamp: number }
>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get cached result if available and not expired
 */
const getCachedDirections = (key: string): DirectionsResult | null => {
  const cached = directionsCache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    directionsCache.delete(key);
    return null;
  }

  return cached.data;
};

/**
 * Get directions with caching
 * Prevents redundant API calls for same route
 */
export const getCachedDirections_withCache = async (
  pickupLat: number,
  pickupLon: number,
  destinationLat: number,
  destinationLon: number,
): Promise<DirectionsResult | null> => {
  // Create cache key from coordinates (rounded to 5 decimals)
  const key = `${pickupLat.toFixed(5)},${pickupLon.toFixed(5)}-${destinationLat.toFixed(5)},${destinationLon.toFixed(5)}`;

  // Check cache first
  const cached = getCachedDirections(key);
  if (cached) {
    console.log("Using cached directions");
    return cached;
  }

  // Fetch fresh directions
  const directions = await getDirections(
    pickupLat,
    pickupLon,
    destinationLat,
    destinationLon,
  );

  if (directions) {
    // Store in cache
    directionsCache.set(key, {
      data: directions,
      timestamp: Date.now(),
    });
  }

  return directions;
};

/**
 * Clear directions cache (useful for testing)
 */
export const clearDirectionsCache = (): void => {
  directionsCache.clear();
  console.log("Directions cache cleared");
};
