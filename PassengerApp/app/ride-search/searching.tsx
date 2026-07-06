import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
} from "react-native";
import { useState, useEffect, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRideSearch } from "../../context/RideSearchContext";
import { apiClient } from "../../services/api/apiClient";
import { subscribeToRideLocation } from "../../services/location/trackingService";
import MapboxRideMap from "../../components/map/MapboxRideMap";

const { width } = Dimensions.get("window");
const GREEN = "#20B768";
const GREEN_LIGHT = "#E8F8F0";

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
  const insets = useSafeAreaInsets();
  const {
    setActiveRide,
    setIsSearchingForDriver,
    resetTrip,
    outboundTrip
  } = useRideSearch();

  const rideStatus = String(rideData?.status || "REQUESTED").toUpperCase();
  const isAccepted = ["ACCEPTED", "ARRIVED", "STARTED"].includes(rideStatus);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing circle effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // 4-segment progress bar animation
    Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 4,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, []);

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
      () => { },
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

  const handleBookAnother = () => {
    resetTrip();
    router.replace("/(drawer)/(tabs)/home");
  };

  // Progress segments component
  const ProgressSegments = () => {
    return (
      <View style={styles.segmentsRow}>
        {[0, 1, 2, 3].map((i) => {
          const opacity = progressAnim.interpolate({
            inputRange: [i, i + 1],
            outputRange: [0.2, 1],
            extrapolate: "clamp",
          });
          const widthVal = progressAnim.interpolate({
            inputRange: [i, i + 1],
            outputRange: ["0%", "100%"],
            extrapolate: "clamp",
          });

          return (
            <View key={i} style={styles.segmentBase}>
              <Animated.View
                style={[
                  styles.segmentFill,
                  {
                    width: widthVal,
                    opacity: opacity
                  }
                ]}
              />
            </View>
          );
        })}
      </View>
    );
  };

  const pickupCoord = outboundTrip.pickup || { latitude: 6.9271, longitude: 79.8612 };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── MAP BACKGROUND ────────────────────────────────────────────────── */}
      <View style={styles.mapWrap}>
        <MapboxRideMap
          style={styles.map}
          pickup={pickupCoord}
          dropoff={pickupCoord} // Simple focus on pickup
          routeCoordinates={[]}
        />
        {/* Pulsing Overlay */}
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.5],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />
        <View style={styles.pickupMarker}>
          <View style={styles.pickupDot} />
          <View style={styles.pickupLabel}>
            <Text style={styles.pickupLabelText}>Pickup</Text>
          </View>
        </View>
      </View>

      {/* ── TOP OVERLAY ─────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pillBtn}
          onPress={handleBookAnother}
        >
          <Text style={styles.pillBtnText}>Book Another Ride</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* ── BOTTOM SHEET ────────────────────────────────────────────────── */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 26 }]}>
        <View style={styles.sheetLayout}>
          <View style={styles.sheetTopRow}>
            <View style={styles.statusWrap}>
              <Text style={styles.statusTitleEnglish}>Searching nearby drivers...</Text>

            </View>

            <View style={styles.searchIconWrap}>
              <View style={styles.roundIcon}>
                <Ionicons name="person" size={24} color="#6B7280" />
                <View style={styles.magnifierWrap}>
                  <Ionicons name="search" size={12} color={GREEN} />
                </View>
              </View>
            </View>
          </View>

          <ProgressSegments />

          <View style={styles.footerRow}>
            <Text style={styles.footerSubSinhala}>Select multiple vehicle types</Text>
            <TouchableOpacity style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again now</Text>
              <Ionicons name="chevron-down" size={16} color="#B45309" />
            </TouchableOpacity>
          </View>

        </View>

        {isAccepted && (
          <TouchableOpacity
            style={styles.matchFoundBtn}
            onPress={handleShowDriver}
            activeOpacity={0.9}
          >
            <Ionicons name="map" size={20} color="#fff" />
            <Text style={styles.matchFoundText}>Driver Found - View Map</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pulseCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(32, 183, 104, 0.25)", // Green theme pulsing
    position: "absolute",
  },
  pickupMarker: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pickupDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#20B768",
    borderWidth: 3,
    borderColor: "#fff",
  },
  pickupLabel: {
    backgroundColor: "#20B768",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  pickupLabelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Top Bar ──
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  pillBtn: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 4,
    marginHorizontal: 8,
  },
  pillBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  cancelBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 4,
  },
  cancelText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Bottom Sheet ──
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 24,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  sheetLayout: {
    width: "100%",
  },
  sheetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  statusWrap: {
    flex: 1,
  },
  statusTitleEnglish: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },

  searchIconWrap: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  roundIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  magnifierWrap: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // ── Progress Segments ──
  segmentsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  segmentBase: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E8F8F0", // Light green base
    overflow: "hidden",
  },
  segmentFill: {
    height: "100%",
    backgroundColor: "#20B768", // Green theme fill
    borderRadius: 3,
  },

  // ── Footer ──
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },
  footerSubSinhala: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309", // Orange-ish in image
  },

  // ── Match Found ──
  matchFoundBtn: {
    backgroundColor: "#20B768",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 20,
  },
  matchFoundText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
