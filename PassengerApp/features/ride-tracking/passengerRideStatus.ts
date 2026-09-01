import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type PassengerRideStatus =
  | "REQUESTED"
  | "SEARCHING"
  | "ACCEPTED"
  | "ARRIVED"
  | "STARTED"
  | "COMPLETED"
  | "PAID"
  | "CANCELLED"
  | "CANCELED";

type IconName = ComponentProps<typeof Ionicons>["name"];

export type PassengerRideStatusUI = {
  title: string;
  message: string;
  bannerMessage: string;
  sheetTitle: string;
  sheetSubtitle: string;
  activityTitle: string;
  activitySubtitle: string;
  icon: IconName;
  tone: "green" | "blue" | "gold" | "red" | "muted";
  progress: number;
};

const statusMap: Record<PassengerRideStatus, PassengerRideStatusUI> = {
  REQUESTED: {
    title: "Finding a driver",
    message: "Your request is live. We are checking nearby drivers.",
    bannerMessage: "Searching nearby drivers around your pickup.",
    sheetTitle: "Finding a driver",
    sheetSubtitle: "Nearest drivers are being checked first.",
    activityTitle: "Searching nearby drivers",
    activitySubtitle: "We will update this when a driver accepts.",
    icon: "search",
    tone: "green",
    progress: 1,
  },
  SEARCHING: {
    title: "Finding a driver",
    message: "Your request is live. We are checking nearby drivers.",
    bannerMessage: "Searching nearby drivers around your pickup.",
    sheetTitle: "Finding a driver",
    sheetSubtitle: "Nearest drivers are being checked first.",
    activityTitle: "Searching nearby drivers",
    activitySubtitle: "We will update this when a driver accepts.",
    icon: "search",
    tone: "green",
    progress: 1,
  },
  ACCEPTED: {
    title: "Driver on the way",
    message: "Your driver accepted the ride and is heading to your pickup.",
    bannerMessage: "Driver on the way. Tap to track live pickup progress.",
    sheetTitle: "Driver on the way",
    sheetSubtitle: "Meet your driver at the pickup point.",
    activityTitle: "Driver assigned",
    activitySubtitle: "Your driver is heading to pickup.",
    icon: "car-sport",
    tone: "green",
    progress: 2,
  },
  ARRIVED: {
    title: "Driver arrived",
    message: "Your driver is at the pickup location. Please meet them safely.",
    bannerMessage: "Driver is waiting at pickup.",
    sheetTitle: "Driver arrived",
    sheetSubtitle: "Please meet your driver at the pickup point.",
    activityTitle: "Driver arrived",
    activitySubtitle: "Your driver is waiting at pickup.",
    icon: "location",
    tone: "gold",
    progress: 3,
  },
  STARTED: {
    title: "Trip started",
    message: "You are on board. Enjoy the ride to your destination.",
    bannerMessage: "Trip started. Follow your route live.",
    sheetTitle: "Trip started",
    sheetSubtitle: "You are heading to your destination.",
    activityTitle: "Trip in progress",
    activitySubtitle: "You are on the way to the destination.",
    icon: "navigate",
    tone: "blue",
    progress: 4,
  },
  COMPLETED: {
    title: "Trip completed",
    message: "Your ride is complete. Please confirm fare details and payment.",
    bannerMessage: "Trip completed. Check payment and receipt.",
    sheetTitle: "Trip completed",
    sheetSubtitle: "Waiting for cash collection confirmation.",
    activityTitle: "Payment pending",
    activitySubtitle: "Trip completed. Cash collection may still be pending.",
    icon: "checkmark-circle",
    tone: "green",
    progress: 5,
  },
  PAID: {
    title: "Payment confirmed",
    message: "Cash collected. Please rate your driver.",
    bannerMessage: "Payment confirmed. Rate your trip.",
    sheetTitle: "Payment confirmed",
    sheetSubtitle: "Cash collected. Please rate your driver.",
    activityTitle: "Ready to rate",
    activitySubtitle: "Payment confirmed. Share your rating.",
    icon: "star",
    tone: "green",
    progress: 5,
  },
  CANCELLED: {
    title: "Ride cancelled",
    message: "This ride has been cancelled.",
    bannerMessage: "Ride cancelled.",
    sheetTitle: "Ride cancelled",
    sheetSubtitle: "This ride is no longer active.",
    activityTitle: "Ride cancelled",
    activitySubtitle: "This ride was cancelled.",
    icon: "close-circle",
    tone: "red",
    progress: 0,
  },
  CANCELED: {
    title: "Ride cancelled",
    message: "This ride has been cancelled.",
    bannerMessage: "Ride cancelled.",
    sheetTitle: "Ride cancelled",
    sheetSubtitle: "This ride is no longer active.",
    activityTitle: "Ride cancelled",
    activitySubtitle: "This ride was cancelled.",
    icon: "close-circle",
    tone: "red",
    progress: 0,
  },
};

export function normalizePassengerRideStatus(status?: string | null, paymentStatus?: string | null): PassengerRideStatus {
  const normalized = String(status || "REQUESTED").toUpperCase();
  const payment = String(paymentStatus || "").toUpperCase();

  // Only treat a ride as "PAID" when the backend explicitly confirms payment
  // for a completed trip and the app has not already handled that confirmation.
  // This avoids re-triggering the rating/payment-confirmed flow on every status
  // refresh or reconnect when the same ride payload is fetched repeatedly.
  if (normalized === "COMPLETED" && payment === "COMPLETED") {
    return "COMPLETED";
  }

  if (normalized in statusMap) return normalized as PassengerRideStatus;
  return "REQUESTED";
}

export function getPassengerRideStatusUI(status?: string | null, paymentStatus?: string | null): PassengerRideStatusUI {
  return statusMap[normalizePassengerRideStatus(status, paymentStatus)];
}

export function isLivePassengerRideStatus(status?: string | null): boolean {
  return ["REQUESTED", "SEARCHING", "ACCEPTED", "ARRIVED", "STARTED"].includes(
    String(status || "").toUpperCase(),
  );
}

