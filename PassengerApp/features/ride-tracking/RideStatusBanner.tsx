import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiClient } from "../../services/api/client";
import { useRideSearch } from "../../state/booking/RideBookingContext";
import { getRideStatus, rideTheme } from "../ride-support/rideUtils";
import { getPassengerRideStatusUI } from "./passengerRideStatus";

const ACTIVE_RIDE_STATUSES = ["ACCEPTED", "ARRIVED", "STARTED"];

export default function RideStatusBanner() {
  const {
    activeRideId,
    activeRideStatus,
    setActiveRide,
    setIsSearchingForDriver,
  } = useRideSearch();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<string | null>(activeRideStatus);
  const [ride, setRide] = useState<any>(null);

  useEffect(() => {
    setStatus(activeRideStatus);
  }, [activeRideStatus]);

  useEffect(() => {
    if (!activeRideId) {
      setRide(null);
      setStatus(null);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      const response = await apiClient.get<any>(`/rides/${activeRideId}`, {
        suppressErrorLog: true,
      });
      if (cancelled || !response.success || !response.data) return;

      const nextStatus = getRideStatus(response.data);
      setRide(response.data);
      setStatus(nextStatus);
      setActiveRide(activeRideId, nextStatus);
      if (ACTIVE_RIDE_STATUSES.includes(nextStatus)) {
        setIsSearchingForDriver(false);
      }
    };

    void poll();
    const pollTimer = setInterval(poll, 6000);
    return () => {
      cancelled = true;
      clearInterval(pollTimer);
    };
  }, [activeRideId, setActiveRide, setIsSearchingForDriver]);

  const hasActiveRide = Boolean(
    activeRideId && status && ACTIVE_RIDE_STATUSES.includes(status),
  );
  const isRideScreen =
    pathname?.startsWith("/ride-tracking") ||
    pathname?.startsWith("/ride-booking") ||
    pathname === "/trips" ||
    pathname?.endsWith("/(tabs)/trips");

  if (!hasActiveRide || isRideScreen) return null;

  const statusUi = getPassengerRideStatusUI(status);

  const trackRide = () => {
    router.push({
      pathname: "/ride-tracking",
      params: {
        rideData: JSON.stringify(ride || { id: activeRideId, status }),
      },
    });
  };

  const bookAnotherRide = () => {
    router.push("/ride-booking");
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={trackRide}
    >
      <View style={styles.backdrop}>
        <View
          style={[styles.card, { paddingBottom: insets.bottom + 20 }]}
          accessibilityViewIsModal
        >
          <View style={styles.iconWrap}>
            <Ionicons name={statusUi.icon} size={32} color="#FFFFFF" />
          </View>

          <Text style={styles.eyebrow}>ACTIVE RIDE</Text>
          <Text style={styles.title}>You’re currently in a ride</Text>
          <Text style={styles.message}>{statusUi.message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.82}
              onPress={trackRide}
            >
              <Ionicons name="navigate" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Track ride</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.82}
              onPress={bookAnotherRide}
            >
              <Ionicons name="add-circle-outline" size={20} color={rideTheme.green} />
              <Text style={styles.secondaryButtonText}>Book another ride</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "rgba(3, 18, 14, 0.68)",
  },
  card: {
    width: "100%",
    height: "50%",
    minHeight: 360,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -10 },
    elevation: 14,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
    backgroundColor: rideTheme.green,
  },
  eyebrow: {
    color: rideTheme.green,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  title: {
    color: rideTheme.ink,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    color: rideTheme.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 7,
    marginBottom: 12,
  },
  actions: {
    width: "100%",
    marginTop: "auto",
  },
  primaryButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: rideTheme.green,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "rgba(32,183,104,0.28)",
    backgroundColor: "#F4FBF7",
  },
  secondaryButtonText: {
    color: rideTheme.green,
    fontSize: 16,
    fontWeight: "900",
  },
});
