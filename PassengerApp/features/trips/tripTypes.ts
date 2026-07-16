export type TripStatus = "SEARCHING" | "ACCEPTED" | "ARRIVED" | "STARTED" | "SCHEDULED" | "COMPLETED" | "CANCELLED" | "COMPLAINT";

export type TripListItem = {
  id: string;
  status: TripStatus;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  fare?: string;
  distance?: string;
  duration?: string;
  driverName?: string;
  vehicleLabel?: string;
  vehicleNumber?: string;
  issue?: string;
  paymentMethod?: string;
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
    status: trip.status,
    pickup_address: trip.pickup,
    drop_address: trip.dropoff,
    created_at: `${trip.date} ${trip.time}`,
    fare_total: trip.fare?.replace(/[^0-9.]/g, "") || undefined,
    distance_text: trip.distance,
    duration_text: trip.duration,
    payment_method: trip.paymentMethod,
    driver: trip.driverName ? { user: { name: trip.driverName } } : undefined,
    vehicle: trip.vehicleLabel || trip.vehicleNumber ? {
      vehicle_number: trip.vehicleNumber,
      model: trip.vehicleLabel,
    } : undefined,
    issue: trip.issue,
  };
}
