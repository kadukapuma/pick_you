/**
 * Normalize ride payloads from API, WebSocket, or navigation params.
 */

const parseCoord = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function normalizeRidePayload(source = {}) {
  const passengerUser = source.passenger?.user ?? {};
  const passengerName = [
    passengerUser.first_name,
    passengerUser.last_name,
  ].filter(Boolean).join(" ");
  const passengerProfilePicture =
    source.customerProfilePicture ??
    source.passenger_profile_picture ??
    source.passengerProfilePicture ??
    source.passenger?.profile_picture ??
    source.passenger?.profile_picture_url ??
    passengerUser.profile_picture ??
    passengerUser.profile_picture_url ??
    passengerUser.profile_picture_path ??
    null;
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
  const vehicleType =
    source.vehicle_type ??
    source.fare_config?.vehicle_type ??
    source.fareConfig?.vehicle_type ??
    source.vehicle?.vehicle_type ??
    source.vehicle?.vehicleType?.name;

  return {
    id: source.id ?? source.ride_id,
    ride_code: source.ride_code,
    pickup: source.pickup ?? source.pickup_address ?? "",
    drop: source.drop ?? source.drop_address ?? "",
    pickupLat,
    pickupLng,
    dropLat,
    dropLng,
    price:
      source.price ??
      Number(source.final_fare || source.estimated_fare || 0).toFixed(2),
    final_fare: source.final_fare,
    estimated_fare: source.estimated_fare,
    distance:
      source.distance ??
      (source.distance_km != null
        ? `${Number(source.distance_km).toFixed(1)} km`
        : ""),
    customerName:
      source.customerName || source.passenger_name || passengerName || "Passenger",
    customerProfilePicture: passengerProfilePicture,
    customerPhone:
      source.customerPhone ??
      source.passenger_phone ??
      source.passenger?.phone ??
      passengerUser.phone ??
      null,
    rating: source.rating,
    vehicle_type: vehicleType,
    requested_at: source.requested_at,
    accepted_at: source.accepted_at,
    arrived_at: source.arrived_at,
    started_at: source.started_at,
    completed_at: source.completed_at,
    cancelled_at: source.cancelled_at,
    status: source.status,
    paymentMode:
      source.paymentMode ??
      source.payment_method ??
      source.payment?.payment_method,
    // Kept in snake_case too: the ride screens show "collect cash" vs "already
    // paid by card" off this, and getting it wrong double-charges the passenger.
    payment_method:
      source.payment_method ??
      source.paymentMode ??
      source.payment?.payment_method,
    use_wallet_credit: Boolean(source.use_wallet_credit),
    payment: source.payment ?? null,
    commission_amount: source.commission_amount,
    driver_earning: source.driver_earning,
    time: source.time,
    cancel_reason: source.cancel_reason ?? source.cancelReason,
    cancelled_by: source.cancelled_by ?? source.cancelledBy,
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
