import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiClient } from "../../services/api/client";
import { useRideSearch } from "../../state/booking/RideBookingContext";
import { getRideStatus, rideTheme } from "../ride-support/rideUtils";
import { getPassengerRideStatusUI } from "./passengerRideStatus";

const visibleStatuses = ["ACCEPTED", "ARRIVED", "STARTED", "COMPLETED", "CANCELLED", "CANCELED"];
const statusRank: Record<string, number> = {
  REQUESTED: 0,
  SEARCHING: 0,
  ACCEPTED: 1,
  ARRIVED: 2,
  STARTED: 3,
  COMPLETED: 4,
  CANCELLED: 5,
  CANCELED: 5,
};

export default function RideStatusBanner() {
  const { activeRideId, activeRideStatus, setActiveRide, setIsSearchingForDriver } = useRideSearch();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<string | null>(activeRideStatus);
  const [ride, setRide] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const activeRideStatusRef = useRef<string | null>(activeRideStatus);
  activeRideStatusRef.current = activeRideStatus;
  const lastStatusRef = useRef<string | null>(activeRideStatus);
  const lastRideIdRef = useRef<number | null>(activeRideId);
  const paymentCompletedRef = useRef(false);
  const pollingRef = useRef(false);
  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!activeRideId) {
      setVisible(false);
      setRide(null);
      setStatus(null);
      lastStatusRef.current = null;
      lastRideIdRef.current = null;
      paymentCompletedRef.current = false;
      return;
    }

    if (lastRideIdRef.current !== activeRideId) {
      lastRideIdRef.current = activeRideId;
      lastStatusRef.current = activeRideStatusRef.current;
      paymentCompletedRef.current = false;
      setStatus(activeRideStatusRef.current);
      setRide(null);
      setVisible(false);
    }

    let cancelled = false;
    const poll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const response = await apiClient.get<any>(`/rides/${activeRideId}`, { suppressErrorLog: true });
        if (cancelled || !response.success || !response.data) return;
        const nextStatus = getRideStatus(response.data);
        const previousStatus = lastStatusRef.current;
        const isBackwardTransition =
          previousStatus != null &&
          (statusRank[nextStatus] ?? -1) < (statusRank[previousStatus] ?? -1);

        // A delayed response must never move the passenger UI back to an older ride state.
        if (isBackwardTransition) return;

        const nextPaymentStatus = String(response.data?.payment?.payment_status || "").toUpperCase();
        const paymentWasCompleted = paymentCompletedRef.current;
        if (nextPaymentStatus === "COMPLETED") paymentCompletedRef.current = true;
        const nextRide = paymentCompletedRef.current && nextPaymentStatus !== "COMPLETED"
          ? {
              ...response.data,
              payment: { ...(response.data.payment || {}), payment_status: "COMPLETED" },
            }
          : response.data;

        setRide(nextRide);
        setActiveRide(activeRideId, nextStatus);
        if (["ACCEPTED", "ARRIVED", "STARTED", "COMPLETED"].includes(nextStatus)) setIsSearchingForDriver(false);

        const paymentJustCompleted = !paymentWasCompleted && paymentCompletedRef.current;
        if ((nextStatus !== previousStatus || paymentJustCompleted) && visibleStatuses.includes(nextStatus)) {
          lastStatusRef.current = nextStatus;
          setStatus(nextStatus);
          setVisible(true);
        }
      } finally {
        pollingRef.current = false;
      }
    };

    poll();
    const id = setInterval(poll, 6000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeRideId, setActiveRide, setIsSearchingForDriver]);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -140,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();
  }, [visible, translateY]);

  if (
    !activeRideId ||
    !status ||
    pathname?.startsWith("/ride-tracking") ||
    pathname?.startsWith("/ride-booking")
  ) return null;

  const paymentStatus = String(ride?.payment?.payment_status || "").toUpperCase();
  const statusUi = getPassengerRideStatusUI(status, paymentStatus);

  const openRide = () => {
    setVisible(false);
    if (status === "COMPLETED") {
      router.push({ pathname: "/ride-details/[rideId]", params: { rideId: String(activeRideId) } });
      return;
    }
    router.push({ pathname: "/ride-tracking", params: { rideData: JSON.stringify(ride || { id: activeRideId, status }) } });
  };

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { paddingTop: insets.top + 8, transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.banner} activeOpacity={0.92} onPress={openRide}>
        <View style={styles.icon}><Ionicons name={statusUi.icon} size={20} color="#FFFFFF" /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>{statusUi.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{statusUi.bannerMessage}</Text>
        </View>
        <TouchableOpacity onPress={() => setVisible(false)} style={styles.close}><Ionicons name="close" size={18} color={rideTheme.muted} /></TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 9999, paddingHorizontal: 14 },
  banner: { minHeight: 72, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(32,183,104,0.18)", flexDirection: "row", alignItems: "center", gap: 12, padding: 12, shadowColor: "#0F172A", shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 7 },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: rideTheme.green, alignItems: "center", justifyContent: "center" },
  title: { color: rideTheme.ink, fontWeight: "900", fontSize: 15 },
  message: { color: rideTheme.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
});
