import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import ScreenTransition from "../../components/ui/ScreenTransition";
import { router } from "expo-router";
import { useRideSearch } from "../../state/booking/RideBookingContext";
import { apiClient } from "../../services/api/client";
import EmptyState from "./TripEmptyState";
import { logExpectedError } from "../../services/errors/userMessages";
import { LiveTripCard, TripSectionHeader, openTripDetails, tripColors } from "./TripListItems";
import { getPassengerRideStatusUI, isLivePassengerRideStatus } from "../ride-tracking/passengerRideStatus";
import type { TripListItem, TripStatus } from "./tripTypes";

function statusForRide(status?: string): TripStatus {
  const normalized = String(status || "SEARCHING").toUpperCase();
  if (["ACCEPTED", "ARRIVED", "STARTED"].includes(normalized)) return normalized as TripStatus;
  return "SEARCHING";
}

function rideToTripItem(ride: any, fallbackId?: number | null): TripListItem {
  return {
    id: String(ride?.id || fallbackId || "live"),
    status: statusForRide(ride?.status),
    pickup: ride?.pickup_address || "Pickup location",
    dropoff: ride?.drop_address || "Destination",
    date: "Live now",
    time: "",
    fare: ride?.fare_total ? `Rs. ${ride.fare_total}` : undefined,
    distance: ride?.distance_text || ride?.distance || undefined,
    duration: ride?.duration_text || undefined,
    driverName: ride?.driver?.user?.name || ride?.driver?.name,
    vehicleLabel: ride?.vehicle?.model || ride?.vehicle_type,
    vehicleNumber: ride?.vehicle?.vehicle_number || ride?.vehicle?.plate_number,
  };
}

export default function OngoingTab() {
  const {
    isSearchingForDriver,
    activeRideId,
    activeRideStatus,
    setIsSearchingForDriver,
    setActiveRide,
  } = useRideSearch();

  const [rideData, setRideData] = useState<any>(null);
  const approvalAlertShownRef = useRef(false);

  useEffect(() => {
    if (!activeRideId) {
      setRideData(null);
      return;
    }

    let cancelled = false;

    const pollRideStatus = async () => {
      try {
        const response = await apiClient.get<any>(`/rides/${activeRideId}`);
        if (cancelled || !response.success || !response.data) return;

        const ride = response.data;
        const rideStatus = String(ride.status || "").toUpperCase();

        setRideData(ride);
        setActiveRide(activeRideId, rideStatus);

        if (isLivePassengerRideStatus(rideStatus) && !approvalAlertShownRef.current) {
          approvalAlertShownRef.current = true;
          setIsSearchingForDriver(false);

        }
      } catch (error) {
        logExpectedError("Ride status polling failed", error);
      }
    };

    pollRideStatus();
    const intervalId = setInterval(pollRideStatus, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeRideId, setActiveRide, setIsSearchingForDriver]);

  const handleCancel = () => {
    if (!activeRideId) return;
    router.push({ pathname: "/ride-booking/cancel-reason", params: { rideId: String(activeRideId) } });
  };

  const hasLiveRide = isSearchingForDriver || isLivePassengerRideStatus(activeRideStatus);
  const liveTrip = hasLiveRide ? rideToTripItem(rideData || { id: activeRideId, status: activeRideStatus }, activeRideId) : null;
  const liveStatusUi = getPassengerRideStatusUI(liveTrip?.status || activeRideStatus);

  if (!hasLiveRide) {
    return <EmptyState title="No active rides" message="Live rides will appear here." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {liveTrip ? (
        <ScreenTransition style={styles.block}>
          <TripSectionHeader title="Live ride" />
          <LiveTripCard
            title={liveStatusUi.activityTitle}
            subtitle={liveStatusUi.activitySubtitle}
            pickup={liveTrip.pickup}
            dropoff={liveTrip.dropoff}
            status={liveTrip.status}
            actionLabel={liveTrip.status === "SEARCHING" ? "View search" : "Track"}
            onAction={() => {
              if (rideData) router.push({ pathname: "/ride-tracking", params: { rideData: JSON.stringify(rideData) } });
              else if (liveTrip) openTripDetails(liveTrip);
            }}
            onCancel={activeRideId ? handleCancel : undefined}
          />
        </ScreenTransition>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tripColors.BG },
  content: { padding: 16, paddingBottom: 112 },
  block: { marginBottom: 20 },
});





