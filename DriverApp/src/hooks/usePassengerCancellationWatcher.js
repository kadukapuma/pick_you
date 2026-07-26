import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { clearActiveRideLocationSync } from "../services/driverLocationSync";

const POLL_INTERVAL_MS = 5000;
const handledCancellationRideIds = new Set();

const isPassengerCancelledRide = (ride) =>
  String(ride?.status || "").toUpperCase() === "CANCELLED" &&
  String(ride?.cancelled_by || ride?.cancelledBy || "").toLowerCase() ===
    "passenger";

export function usePassengerCancellationWatcher(rideId, navigation) {
  const isFocused = useIsFocused();
  const rideKey = rideId == null ? null : String(rideId);
  const handledRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [cancelledRide, setCancelledRide] = useState(null);

  const returnToHome = useCallback(() => {
    setVisible(false);
    if (typeof navigation?.reset === "function") {
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
    } else {
      navigation?.navigate?.("MainTabs");
    }
  }, [navigation]);

  useEffect(() => {
    handledRef.current = false;
  }, [rideKey]);

  useEffect(() => {
    if (!rideKey || !isFocused || handledCancellationRideIds.has(rideKey)) {
      return;
    }

    let disposed = false;
    let isChecking = false;
    let interval = null;

    const handlePassengerCancellation = async (ride) => {
      if (
        handledRef.current ||
        disposed ||
        handledCancellationRideIds.has(rideKey)
      ) {
        return;
      }

      handledRef.current = true;
      handledCancellationRideIds.add(rideKey);
      if (interval) {
        clearInterval(interval);
        interval = null;
      }

      try {
        await clearActiveRideLocationSync();
      } catch (error) {
        console.log("Error clearing active ride after cancellation:", error);
      }

      if (disposed) return;
      setCancelledRide(ride ?? null);
      setVisible(true);
    };

    const checkRideStatus = async () => {
      if (isChecking || handledRef.current || disposed) return;

      isChecking = true;
      try {
        const response = await api.get(`/rides/${rideKey}`);
        const currentRide = response.data?.data ?? response.data;

        if (isPassengerCancelledRide(currentRide)) {
          await handlePassengerCancellation(currentRide);
        }
      } catch (error) {
        console.log("Error checking ride status:", error);
      } finally {
        isChecking = false;
      }
    };

    interval = setInterval(checkRideStatus, POLL_INTERVAL_MS);
    checkRideStatus();

    return () => {
      disposed = true;
      if (interval) clearInterval(interval);
    };
  }, [isFocused, rideKey]);

  return {
    visible,
    cancelledRide,
    acknowledgeCancellation: returnToHome,
  };
}
