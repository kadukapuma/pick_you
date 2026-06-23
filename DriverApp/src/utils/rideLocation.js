/**
 * Normalize ride payloads from API, WebSocket, or navigation params.
 */

const parseCoord = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function normalizeRidePayload(source = {}) {
  const pickupLat = parseCoord(
    source.pickup_lat ??
      source.pickupLat ??
      source.pickup_latitude,
  );
  const pickupLng = parseCoord(
    source.pickup_lng ??
      source.pickupLng ??
      source.pickup_longitude,
  );
  const dropLat = parseCoord(
    source.drop_lat ?? source.dropLat ?? source.drop_latitude,
  );
  const dropLng = parseCoord(
    source.drop_lng ?? source.dropLng ?? source.drop_longitude,
  );

  return {
    id: source.id ?? source.ride_id,
    ride_code: source.ride_code,
    pickup: source.pickup ?? source.pickup_address ?? "",
    drop: source.drop ?? source.drop_address ?? "",
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    price: source.price ?? Number(source.estimated_fare || 0).toFixed(2),
    distance:
      source.distance ??
      (source.distance_km != null
        ? `${Number(source.distance_km).toFixed(1)} km`
        : ""),
    customerName:
      source.customerName ?? source.passenger_name ?? "Passenger",
    rating: source.rating,
    vehicle_type: source.vehicle_type,
    requested_at: source.requested_at,
    status: source.status,
    paymentMode: source.paymentMode,
    time: source.time,
  };
}

export function getPickupCoordinate(ride) {
  if (ride?.pickupLat == null || ride?.pickupLng == null) return null;
  return { latitude: ride.pickupLat, longitude: ride.pickupLng };
}

export function getDropCoordinate(ride) {
  if (ride?.dropLat == null || ride?.dropLng == null) return null;
  return { latitude: ride.dropLat, longitude: ride.dropLng };
}

export function hasValidPickup(ride) {
  return getPickupCoordinate(ride) !== null;
}

export function hasValidDrop(ride) {
  return getDropCoordinate(ride) !== null;
}
