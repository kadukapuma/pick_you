import { ImageSourcePropType } from "react-native";

export const rideTheme = {
  green: "#20B768",
  darkGreen: "#0B3D2E",
  softGreen: "#E8F8F0",
  gold: "#FBBF24",
  ink: "#0F172A",
  muted: "#64748B",
  line: "#E2E8F0",
  bg: "#F4FBFF",
  danger: "#DC2626",
};

export const logoSource: ImageSourcePropType = require("../../assets/images/logo.png");

export function money(value: any): string {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "0.00";
}

export function firstPositiveNumber(...values: any[]): number {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}

export function getRideId(ride: any): number | null {
  const id = Number(ride?.id || ride?.ride_id || ride?.trip_id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function getRideStatus(ride: any): string {
  return String(ride?.status || "REQUESTED").toUpperCase();
}

export function getDriverName(ride: any): string {
  const user = ride?.driver?.user;
  const full = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  return full || user?.name || ride?.driver?.name || ride?.driverName || "Your driver";
}

export function getDriverPhone(ride: any): string | null {
  return ride?.driver?.user?.phone || ride?.driver?.phone || ride?.driver_phone || null;
}

export function getDriverProfilePicture(ride: any): string | null {
  const user = ride?.driver?.user;
  return (
    user?.profile_picture ||
    user?.profile_picture_url ||
    user?.profile_picture_path ||
    ride?.driver?.profile_picture ||
    ride?.driver?.profile_picture_url ||
    ride?.driver_profile_picture ||
    ride?.driverProfilePicture ||
    null
  );
}

export function getVehicleNumber(ride: any): string {
  return ride?.vehicle?.vehicle_number || ride?.vehicle?.plate_number || ride?.vehicle_number || "Vehicle";
}

export function getVehicleDescription(ride: any): string {
  const vehicle = ride?.vehicle || {};
  return [vehicle.color, vehicle.brand, vehicle.model, vehicle.vehicle_type || ride?.vehicle_type]
    .filter(Boolean)
    .join(" ") || "Assigned vehicle";
}

export function getFareTotal(ride: any): string {
  return money(firstPositiveNumber(
    ride?.final_fare,
    ride?.fare_total,
    ride?.payment?.amount,
    ride?.estimated_fare,
  ));
}

export function statusTitle(status: string): string {
  switch (status.toUpperCase()) {
    case "ACCEPTED":
      return "Driver found";
    case "ARRIVED":
      return "Driver arrived";
    case "STARTED":
      return "Ride started";
    case "COMPLETED":
      return "Ride completed";
    case "CANCELLED":
    case "CANCELED":
      return "Ride cancelled";
    default:
      return "Finding a driver";
  }
}

export function statusMessage(status: string): string {
  switch (status.toUpperCase()) {
    case "ACCEPTED":
      return "Your driver accepted the ride. Tap to view live tracking.";
    case "ARRIVED":
      return "Your driver is at the pickup location.";
    case "STARTED":
      return "You are on the way to the destination.";
    case "COMPLETED":
      return "Trip finished. Review fare, payment, and rating.";
    case "CANCELLED":
    case "CANCELED":
      return "This ride has been cancelled.";
    default:
      return "Your request is live. We are checking nearby drivers.";
  }
}
export type RideCoordinate = { latitude: number; longitude: number };

const readNumber = (...values: any[]): number | null => {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
};

export function getRidePickupCoordinate(ride: any): RideCoordinate | null {
  const latitude = readNumber(
    ride?.pickup_latitude,
    ride?.pickup_lat,
    ride?.pickup?.latitude,
    ride?.pickup?.lat,
  );
  const longitude = readNumber(
    ride?.pickup_longitude,
    ride?.pickup_lng,
    ride?.pickup_lon,
    ride?.pickup?.longitude,
    ride?.pickup?.lng,
  );
  return latitude == null || longitude == null ? null : { latitude, longitude };
}

export function getRideDropoffCoordinate(ride: any): RideCoordinate | null {
  const latitude = readNumber(
    ride?.drop_latitude,
    ride?.drop_lat,
    ride?.dropoff_latitude,
    ride?.dropoff_lat,
    ride?.destination?.latitude,
    ride?.dropoff?.latitude,
    ride?.drop?.latitude,
  );
  const longitude = readNumber(
    ride?.drop_longitude,
    ride?.drop_lng,
    ride?.dropoff_longitude,
    ride?.dropoff_lng,
    ride?.dropoff_lon,
    ride?.destination?.longitude,
    ride?.dropoff?.longitude,
    ride?.drop?.longitude,
  );
  return latitude == null || longitude == null ? null : { latitude, longitude };
}

export function formatMetersDistance(meters: number | null | undefined): string | null {
  const value = Number(meters);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`;
  return `${Math.round(value)} m`;
}

export function getBackendRideDistanceText(ride: any): string | null {
  if (typeof ride?.distanceText === "string") return ride.distanceText;
  if (typeof ride?.distance_text === "string") return ride.distance_text;
  if (typeof ride?.route?.distanceText === "string") return ride.route.distanceText;

  const kmValue = readNumber(
    ride?.distance_km,
    ride?.total_distance_km,
    ride?.estimated_distance_km,
  );
  if (kmValue != null && kmValue > 0) return `${kmValue.toFixed(1)} km`;

  return formatMetersDistance(readNumber(ride?.distance, ride?.route?.distance));
}
