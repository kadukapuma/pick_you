/**
 * Distance and Route Calculation Service
 */

export interface RouteInfo {
  distance: number; // in kilometers
  duration: number; // in minutes
  distanceText: string; // formatted distance (e.g., "12.5 km")
  durationText: string; // formatted duration (e.g., "25 mins")
}

/**
 * Haversine formula to calculate distance between two coordinates
 * Returns distance in kilometers
 */
const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Estimate time based on distance
 * Average speed: 25 km/h in urban areas (Sri Lanka traffic)
 */
const estimateTime = (distanceKm: number): number => {
  const averageSpeed = 25; // km/h
  return Math.ceil((distanceKm / averageSpeed) * 60); // return in minutes
};

/**
 * Calculate route info between two locations
 */
export const calculateRouteInfo = (
  pickupLat: number,
  pickupLon: number,
  destinationLat: number,
  destinationLon: number,
): RouteInfo => {
  const distance = haversineDistance(
    pickupLat,
    pickupLon,
    destinationLat,
    destinationLon,
  );
  const duration = estimateTime(distance);

  return {
    distance,
    duration,
    distanceText: `${distance.toFixed(1)} km`,
    durationText: `${duration} mins`,
  };
};

/**
 * Format distance for display
 */
export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

/**
 * Format duration for display
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} mins`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};
