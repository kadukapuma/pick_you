import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../services/api/apiClient";
import { subscribeToRideLocation } from "../services/location/trackingService";
import { useRideSearch } from "../context/RideSearchContext";

export default function SearchingScreen() {
  const params = useLocalSearchParams();
  const initialRideData = useMemo(
    () => (params.rideData ? JSON.parse(params.rideData as string) : null),
    [params.rideData],
  );
  const [rideData, setRideData] = useState<any>(initialRideData);
  const [isCancelling, setIsCancelling] = useState(false);
  const alertShownRef = useRef(false);
  const rideId = Number(rideData?.id || initialRideData?.id || 0);
  const { setActiveRide, setIsSearchingForDriver, resetTrip } = useRideSearch();

  const rideStatus = String(rideData?.status || "REQUESTED").toUpperCase();
  const isAccepted = ["ACCEPTED", "ARRIVED", "STARTED"].includes(rideStatus);

  useEffect(() => {
    if (!rideId) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const acceptRideUpdate = (ride: any) => {
      if (cancelled || !ride) return;

      const status = String(ride.status || "").toUpperCase();
      setRideData(ride);
      setActiveRide(rideId, status);

      if (["ACCEPTED", "ARRIVED", "STARTED"].includes(status)) {
        setIsSearchingForDriver(false);
        if (!alertShownRef.current) {
          alertShownRef.current = true;
          Alert.alert(
            status === "ARRIVED" ? "Driver arrived" : "Driver accepted",
            status === "ARRIVED"
              ? "Your driver is at the pickup location."
              : "Your driver is on the way.",
          );
        }
      }
    };

    subscribeToRideLocation(
      rideId,
      () => {},
      undefined,
      acceptRideUpdate,
    ).then((cleanup) => {
      unsubscribe = cleanup;
    }).catch((error) => {
      console.log("Ride acceptance realtime setup failed:", error);
    });

    const fetchRide = async () => {
      const response = await apiClient.get<any>(`/rides/${rideId}`, {
        suppressErrorLog: true,
      });
      if (response.success && response.data) acceptRideUpdate(response.data);
    };

    fetchRide();
    const pollTimer = setInterval(fetchRide, 5000);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      unsubscribe?.();
    };
  }, [rideId, setActiveRide, setIsSearchingForDriver]);

  const handleShowDriver = () => {
    if (!rideData) return;
    router.replace({
      pathname: "/live-tracker",
      params: { rideData: JSON.stringify(rideData) },
    });
  };

  const handleCancel = async () => {
    if (!rideId || isCancelling || isAccepted) return;

    setIsCancelling(true);
    const response = await apiClient.delete(`/rides/${rideId}`);
    setIsCancelling(false);

    if (response.success) {
      resetTrip();
      router.replace("/(drawer)/(tabs)/home");
      return;
    }

    Alert.alert("Cancel failed", response.message || "Please try again.");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={styles.title}>
          {isAccepted ? "Driver accepted" : "Finding a driver"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconCircle, isAccepted && styles.acceptedCircle]}>
          {isAccepted ? (
            <Ionicons name="checkmark" size={38} color="#FFFFFF" />
          ) : (
            <ActivityIndicator size="large" color="#FBBF24" />
          )}
        </View>

        <Text style={styles.messageTitle}>
          {rideStatus === "ARRIVED"
            ? "Your driver has arrived"
            : rideStatus === "STARTED"
              ? "Trip has started"
              : isAccepted
                ? "Your driver is on the way"
                : "Searching nearby drivers"}
        </Text>
        <Text style={styles.message}>
          {rideStatus === "ARRIVED"
            ? "Meet your driver at the pickup point, or view the live map."
            : rideStatus === "STARTED"
              ? "Passenger on board. You can follow the trip to drop-off."
              : isAccepted
                ? "You can now view the driver's live location on the map."
            : "Please wait while we send your request to the nearest available driver."}
        </Text>

        {isAccepted ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleShowDriver}
            activeOpacity={0.9}
          >
            <Ionicons name="map" size={20} color="#0F172A" />
            <Text style={styles.primaryButtonText}>Show driver</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleCancel}
            activeOpacity={0.85}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.secondaryButtonText}>Cancel request</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    marginTop: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F4FBFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  iconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 26,
    borderWidth: 1,
    borderColor: "#334155",
  },
  acceptedCircle: {
    backgroundColor: "#00A859",
    borderColor: "#86EFAC",
  },
  messageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: "#CBD5E1",
    textAlign: "center",
    marginBottom: 34,
  },
  primaryButton: {
    minHeight: 54,
    minWidth: 210,
    borderRadius: 18,
    backgroundColor: "#FBBF24",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  secondaryButton: {
    minHeight: 50,
    minWidth: 190,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 22,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
});
