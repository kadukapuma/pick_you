import { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiClient } from "../../services/api/apiClient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRideSearch } from "../../context/RideSearchContext";

interface RideBookingResponse {
  id?: number | string;
}

export default function ConfirmationScreen() {
  const [isBooking, setIsBooking] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  const insets = useSafeAreaInsets();
  const {
    tripType,
    outboundTrip,
    returnTrip,
    setIsSearchingForDriver,
    setActiveRide,
  } = useRideSearch();

  // Bottom sheet animation
  const sheetY = useRef(new Animated.Value(300)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  // Payment details modal animation (if using a custom overlay)
  const paymentModalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation for sheet
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (outboundTrip.pickup && outboundTrip.dropoff) {
        setLoadingRoute(true);
        try {
          const res = await getCachedDirections_withCache(
            outboundTrip.pickup.latitude,
            outboundTrip.pickup.longitude,
            outboundTrip.dropoff.latitude,
            outboundTrip.dropoff.longitude,
          );
          if (!cancelled) setDirections(res);
        } catch (e) {
          console.error("Directions error in Confirmation:", e);
        } finally {
          if (!cancelled) setLoadingRoute(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outboundTrip.pickup, outboundTrip.dropoff]);

  const togglePaymentDetails = () => {
    const toValue = showPaymentDetails ? 0 : 1;
    if (!showPaymentDetails) setShowPaymentDetails(true);
    Animated.timing(paymentModalOpacity, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (toValue === 0) setShowPaymentDetails(false);
    });
  };

  if (
    !outboundTrip.pickup ||
    !outboundTrip.dropoff ||
    !outboundTrip.selectedRide
  ) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Booking data missing</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleConfirmBooking = async () => {
    setIsBooking(true);
    try {
      const payload = {
        vehicle_type: outboundTrip.selectedRide!.id,
        pickup_address: outboundTrip.pickup!.address || "Unknown Pickup",
        pickup_lat: outboundTrip.pickup!.latitude,
        pickup_lng: outboundTrip.pickup!.longitude,
        drop_address: outboundTrip.dropoff!.address || "Unknown Drop",
        drop_lat: outboundTrip.dropoff!.latitude,
        drop_lng: outboundTrip.dropoff!.longitude,
      };

      const response = await apiClient.post<RideBookingResponse>("/rides", payload);

      if (response.success) {
        const rideId = response.data?.id ? Number(response.data.id) : null;
        setIsSearchingForDriver(true);
        setActiveRide(rideId, "REQUESTED");

        // Show the waiting screen first. It will reveal the map button as soon
        // as a driver accepts the request.
        router.replace({
          pathname: "/ride-search/searching",
          params: { rideData: JSON.stringify(response.data) }
        });
      } else {
        const errorMsg =
          typeof response.message === "string"
            ? response.message
            : JSON.stringify(response.errors);
        Alert.alert("Error booking ride", errorMsg || "Unknown error");
      }
    } catch {
      Alert.alert("Error", "Network or server error.");
    } finally {
      setIsBooking(false);
    }
  };

  const totalPrice =
    outboundTrip.selectedRide.price + (returnTrip.selectedRide?.price || 0);

  const totalDistance = directions
    ? (directions.distance / 1000).toFixed(2)
    : "5.00";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── MAP BACKGROUND ────────────────────────────────────────────────── */}
      <MapboxRideMap
        style={styles.map}
        pickup={outboundTrip.pickup!}
        dropoff={outboundTrip.dropoff!}
        routeCoordinates={
          directions && directions.polyline.length > 0
            ? directions.polyline
            : [outboundTrip.pickup!, outboundTrip.dropoff!]
        }
        routeColor="#20B768"
        pickupColor="#20B768"
        dropoffColor="#F97316"
      />

      {/* ── BACK BUTTON ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.backBtn, { top: (StatusBar.currentHeight ?? 24) + 12 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color="#111827" />
      </TouchableOpacity>

      {/* ── PAYMENT MODAL OVERLAY ───────────────────────────────────────── */}
      {showPaymentDetails && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={togglePaymentDetails}
        >
          <Animated.View
            style={[
              styles.paymentModal,
              { opacity: paymentModalOpacity, bottom: 250 + insets.bottom },
            ]}
          >
            <Text style={styles.modalTitle}>Trip Summary</Text>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Vehicle</Text>
              <Text style={styles.modalValue}>{outboundTrip.selectedRide.name}</Text>
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Distance</Text>
              <Text style={styles.modalValue}>{totalDistance} km</Text>
            </View>

            <View style={styles.priceDividerSmall} />

            <View style={styles.modalLocationRow}>
              <Ionicons name="radio-button-on" size={12} color="#20B768" />
              <Text style={styles.modalLocationText} numberOfLines={1}>
                {outboundTrip.pickup.address}
              </Text>
            </View>
            <View style={styles.modalLocationRow}>
              <Ionicons name="location" size={12} color="#F97316" />
              <Text style={styles.modalLocationText} numberOfLines={1}>
                {outboundTrip.dropoff.address}
              </Text>
            </View>

            <View style={styles.priceDividerSmall} />

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Payment Method</Text>
              <Text style={styles.modalValue}>Cash</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>Total Amount</Text>
              <Text style={styles.totalValueModal}>LKR {totalPrice.toFixed(2)}</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* ── BOTTOM SHEET ─────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom + 20,
            opacity: sheetOpacity,
            transform: [{ translateY: sheetY }],
          },
        ]}
      >
        <View style={styles.handle} />

        <View style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Confirm Booking</Text>
            <TouchableOpacity
              style={styles.paymentToggleRow}
              onPress={togglePaymentDetails}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={16} color="#20B768" />
              <Text style={styles.paymentToggleText}>details</Text>
              <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View style={styles.addressRow}>
            <View style={styles.pickupDotWrap}>
              <Ionicons name="location" size={20} color="#20B768" />
            </View>
            <View style={styles.addressTextWrap}>
              <Text style={styles.addressMain}>
                {outboundTrip.pickup.address.split(",")[0]}
              </Text>
              <Text style={styles.addressSub} numberOfLines={1}>
                {outboundTrip.pickup.address}
              </Text>
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmBtn, isBooking && styles.confirmBtnDisabled]}
            onPress={handleConfirmBooking}
            disabled={isBooking}
            activeOpacity={0.8}
          >
            {isBooking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>Confirm Booking</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  paymentIconBtn: {
    display: "none",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  paymentToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  paymentToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },

  // ── Bottom Sheet ──
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 10,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    marginBottom: 20,
  },
  sheetContent: {
    width: "100%",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  pickupDotWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  addressTextWrap: {
    flex: 1,
  },
  addressMain: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  addressSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  confirmBtn: {
    backgroundColor: "#20B768", // Green theme color
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Payment Modal ──
  paymentModal: {
    position: "absolute",
    right: 16,
    width: 260,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
  },
  modalLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  modalValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  modalLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  modalLocationText: {
    fontSize: 12,
    color: "#4B5563",
    flex: 1,
  },
  priceDividerSmall: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  totalValueModal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#20B768",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "500",
  },
  backButton: {
    marginTop: 20,
    backgroundColor: "#0B7BDC",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
