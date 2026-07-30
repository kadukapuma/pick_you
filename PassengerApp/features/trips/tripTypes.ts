export type TripStatus = "SEARCHING" | "ACCEPTED" | "ARRIVED" | "STARTED" | "SCHEDULED" | "COMPLETED" | "CANCELLED" | "COMPLAINT";

export type TripListItem = {
  id: string;
  rideCode?: string;
  status: TripStatus;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  requestedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  estimatedFare?: number;
  finalFare?: number;
  paymentAmount?: number;
  fare?: string;
  distance?: string;
  distanceKm?: number;
  estimatedDistanceKm?: number;
  actualDistanceKm?: number;
  duration?: string;
  estimatedDurationMinutes?: number;
  actualDurationMinutes?: number;
  driverName?: string;
  driverProfilePicture?: string | null;
  vehicleLabel?: string;
  vehicleNumber?: string;
  issue?: string;
  paymentMethod?: string;
  paymentStatus?: string;
};

export function getTripStatusLabel(status: TripStatus) {
  switch (status) {
    case "SEARCHING":
      return "Finding driver";
    case "ACCEPTED":
      return "Driver assigned";
    case "ARRIVED":
      return "Driver arrived";
    case "STARTED":
      return "In progress";
    case "SCHEDULED":
      return "Scheduled";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "COMPLAINT":
      return "Under review";
    default:
      return "Trip";
  }
}

export function toRideDetailsPayload(trip: TripListItem) {
  return {
    id: trip.id,
    ride_code: trip.rideCode,
    status: trip.status,
    pickup_address: trip.pickup,
    drop_address: trip.dropoff,
    created_at: `${trip.date} ${trip.time}`,
    requested_at: trip.requestedAt,
    completed_at: trip.completedAt,
    cancelled_at: trip.cancelledAt,
    fare_total: trip.fare?.replace(/[^0-9.]/g, "") || undefined,
    estimated_fare: trip.estimatedFare,
    final_fare: trip.finalFare,
    distance_km: trip.distanceKm,
    estimated_distance_km: trip.estimatedDistanceKm,
    actual_distance_km: trip.actualDistanceKm,
    estimated_duration_minutes: trip.estimatedDurationMinutes,
    actual_duration_minutes: trip.actualDurationMinutes,
    distance_text: trip.distance,
    duration_text: trip.duration,
    payment_method: trip.paymentMethod,
    payment: trip.paymentMethod || trip.paymentAmount ? {
      amount: trip.paymentAmount,
      payment_method: trip.paymentMethod,
      payment_status: trip.paymentStatus,
    } : undefined,
    driver: trip.driverName ? { user: { name: trip.driverName, profile_picture: trip.driverProfilePicture } } : undefined,
    vehicle: trip.vehicleLabel || trip.vehicleNumber ? {
      vehicle_number: trip.vehicleNumber,
      model: trip.vehicleLabel,
    } : undefined,
    issue: trip.issue,
  };
}
