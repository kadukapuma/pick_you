import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Dimensions,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiClient } from "../../services/api/client";
import GoogleRideMap from "../../features/ride-booking/map/GoogleRideMap";
import { useNearbyVehicles } from "../../services/rides/nearbyVehicles";
import { useRideSearch } from "../../state/booking/RideBookingContext";
import {
  getFriendlyErrorMessage,
  logExpectedError,
} from "../../services/errors/userMessages";
import {
  fallbackRoute,
  formatDistance,
  getCachedDirections_withCache,
  type DirectionsResult,
} from "../../services/maps/directionsApi";

interface RideBookingResponse {
  id?: number | string;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLLAPSED_SHEET_HEIGHT = 330;
const EXPANDED_SHEET_HEIGHT = Math.min(SCREEN_HEIGHT - 24, 720);
const COLLAPSED_OFFSET = EXPANDED_SHEET_HEIGHT - COLLAPSED_SHEET_HEIGHT;

export default function ConfirmationScreen() {
  const [isBooking, setIsBooking] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [returnDirections, setReturnDirections] =
    useState<DirectionsResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  const insets = useSafeAreaInsets();
  const {
    tripType,
    outboundTrip,
    setIsSearchingForDriver,
    setActiveRide,
    paymentMethod,
    selectedPaymentCard,
    usePickuCredit,
  } = useRideSearch();
  const isReturnTrip = tripType === "return";
  const nearbySelectedVehicles = useNearbyVehicles(
    outboundTrip.pickup,
    outboundTrip.selectedRide?.id,
  );

  // Bottom sheet animation
  const sheetY = useRef(new Animated.Value(COLLAPSED_OFFSET)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const isSheetExpandedRef = useRef(false);

  const snapSheet = useCallback(
    (expanded: boolean) => {
      isSheetExpandedRef.current = expanded;
      setIsSheetExpanded(expanded);
      Animated.spring(sheetY, {
        toValue: expanded ? 0 : COLLAPSED_OFFSET,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }).start();
    },
    [sheetY],
  );

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 8 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          sheetY.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const startPosition = isSheetExpandedRef.current
            ? 0
            : COLLAPSED_OFFSET;
          sheetY.setValue(
            Math.max(0, Math.min(COLLAPSED_OFFSET, startPosition + gesture.dy)),
          );
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldExpand =
            gesture.vy < -0.35 ||
            (!isSheetExpandedRef.current && gesture.dy < -60);
          const shouldCollapse =
            gesture.vy > 0.35 ||
            (isSheetExpandedRef.current && gesture.dy > 60);

          if (shouldExpand) snapSheet(true);
          else if (shouldCollapse) snapSheet(false);
          else snapSheet(isSheetExpandedRef.current);
        },
        onPanResponderTerminate: () => snapSheet(isSheetExpandedRef.current),
      }),
    [sheetY, snapSheet],
  );

  useEffect(() => {
    // Entrance animation for sheet
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: COLLAPSED_OFFSET,
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
  }, [sheetOpacity, sheetY]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (outboundTrip.pickup && outboundTrip.dropoff) {
        setLoadingRoute(true);
        const fallback = fallbackRoute(
          outboundTrip.pickup.latitude,
          outboundTrip.pickup.longitude,
          outboundTrip.dropoff.latitude,
          outboundTrip.dropoff.longitude,
        );
        setDirections(fallback);
        if (isReturnTrip) {
          setReturnDirections(
            fallbackRoute(
              outboundTrip.dropoff.latitude,
              outboundTrip.dropoff.longitude,
              outboundTrip.pickup.latitude,
              outboundTrip.pickup.longitude,
            ),
          );
        }
        setLoadingRoute(false);
        try {
          const [res, returnRes] = await Promise.all([
            getCachedDirections_withCache(
              outboundTrip.pickup.latitude,
              outboundTrip.pickup.longitude,
              outboundTrip.dropoff.latitude,
              outboundTrip.dropoff.longitude,
            ),
            isReturnTrip
              ? getCachedDirections_withCache(
                  outboundTrip.dropoff.latitude,
                  outboundTrip.dropoff.longitude,
                  outboundTrip.pickup.latitude,
                  outboundTrip.pickup.longitude,
                )
              : Promise.resolve(null),
          ]);
          if (!cancelled && res) setDirections(res);
          if (!cancelled && isReturnTrip && returnRes)
            setReturnDirections(returnRes);
        } catch (e) {
          logExpectedError("Confirmation route lookup failed", e);
        } finally {
          if (!cancelled) setLoadingRoute(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outboundTrip.pickup, outboundTrip.dropoff, isReturnTrip]);

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
      // For a return trip, `outboundTrip.dropoff` holds the destination (B) —
      // the backend always derives the actual drop as the pickup point (A) for
      // a return booking, so `drop_*` here is a placeholder the server ignores.
      const payload = {
        vehicle_type: outboundTrip.selectedRide!.id,
        trip_type: isReturnTrip ? "return" : "oneway",
        pickup_address: outboundTrip.pickup!.address || "Unknown Pickup",
        pickup_lat: outboundTrip.pickup!.latitude,
        pickup_lng: outboundTrip.pickup!.longitude,
        drop_address: isReturnTrip
          ? outboundTrip.pickup!.address || "Unknown Pickup"
          : outboundTrip.dropoff!.address || "Unknown Drop",
        drop_lat: isReturnTrip
          ? outboundTrip.pickup!.latitude
          : outboundTrip.dropoff!.latitude,
        drop_lng: isReturnTrip
          ? outboundTrip.pickup!.longitude
          : outboundTrip.dropoff!.longitude,
        ...(isReturnTrip
          ? {
              destination_address:
                outboundTrip.dropoff!.address || "Unknown Destination",
              destination_lat: outboundTrip.dropoff!.latitude,
              destination_lng: outboundTrip.dropoff!.longitude,
            }
          : {}),
        payment_method: paymentMethod,
        // The app shows PickU credit and loyalty points as one combined
        // balance under a single toggle - both flags mirror it, and the
        // backend simply reserves nothing from whichever side has no
        // balance.
        use_wallet_credit: usePickuCredit,
        use_loyalty_points: usePickuCredit,
      };

      if (__DEV__) {
        console.log("Ride booking payload", {
          vehicle_type: payload.vehicle_type,
          pickup: {
            address: payload.pickup_address,
            latitude: payload.pickup_lat,
            longitude: payload.pickup_lng,
          },
          dropoff: {
            address: payload.drop_address,
            latitude: payload.drop_lat,
            longitude: payload.drop_lng,
          },
        });
      }

      const response = await apiClient.post<RideBookingResponse>(
        "/rides",
        payload,
      );

      if (response.success) {
        const rideId = response.data?.id ? Number(response.data.id) : null;
        setIsSearchingForDriver(true);
        setActiveRide(rideId, "REQUESTED");

        // Show the waiting screen first. It will reveal the map button as soon
        // as a driver accepts the request.
        router.replace({
          pathname: "/ride-booking/matching",
          params: {
            rideData: JSON.stringify({
              ...response.data,
              vehicle_type: payload.vehicle_type,
              selected_payment_method: paymentMethod,
              use_wallet_credit: usePickuCredit,
              use_loyalty_points: usePickuCredit,
            }),
          },
        });
      } else {
        const errorMsg =
          typeof response.message === "string"
            ? response.message
            : JSON.stringify(response.errors);
        const friendlyMessage = getFriendlyErrorMessage(
          errorMsg,
          "Please check your trip details and try again.",
        );
        const title = /no online drivers available|no drivers available/i.test(
          errorMsg,
        )
          ? "No drivers nearby"
          : "Could not book ride";
        Alert.alert(title, friendlyMessage);
      }
    } catch (error) {
      logExpectedError("Ride booking request failed", error);
      const rawMessage =
        error instanceof Error ? error.message : String(error || "");
      const friendlyMessage = getFriendlyErrorMessage(
        error,
        "Connection problem. Please check your internet and try again.",
      );
      const title = /no online drivers available|no drivers available/i.test(
        rawMessage,
      )
        ? "No drivers nearby"
        : "Could not book ride";
      Alert.alert(title, friendlyMessage);
    } finally {
      setIsBooking(false);
    }
  };

  // For a return trip, select-vehicle.tsx already priced the full round trip
  // (pickup -> destination -> pickup), so this is the whole fare, not one leg.
  const totalPrice = outboundTrip.selectedRide.price;

  const totalDistanceText =
    isReturnTrip && directions && returnDirections
      ? formatDistance(directions.distance + returnDirections.distance)
      : directions?.distanceText || "Calculating route";
  const selectedVehicleMarkers = nearbySelectedVehicles;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── MAP BACKGROUND ────────────────────────────────────────────────── */}
      <GoogleRideMap
        style={styles.map}
        pickup={outboundTrip.pickup!}
        dropoff={outboundTrip.dropoff!}
        routeCoordinates={
          isReturnTrip
            ? directions && returnDirections
              ? [...directions.polyline, ...returnDirections.polyline]
              : [outboundTrip.pickup!, outboundTrip.dropoff!, outboundTrip.pickup!]
            : directions && directions.polyline.length > 0
              ? directions.polyline
              : [outboundTrip.pickup!, outboundTrip.dropoff!]
        }
        routeColor="#20B768"
        pickupColor="#20B768"
        // A return trip's "dropoff" here is really the mid-trip destination
        // waypoint the driver comes back from, and the ride's actual drop is
        // always forced equal to pickup server-side - see select-vehicle.tsx.
        pickupLabel={isReturnTrip ? "Pickup & Drop" : undefined}
        dropoffLabel={isReturnTrip ? "Return Point" : "Drop"}
        dropoffColor={isReturnTrip ? "#7C3AED" : "#F97316"}
        nearbyVehicles={selectedVehicleMarkers}
      />

      {/* ── BACK BUTTON ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.backBtn, { top: (StatusBar.currentHeight ?? 24) + 12 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color="#111827" />
      </TouchableOpacity>

      {/* ── BOTTOM SHEET ─────────────────────────────────────────────────── */}
      <Animated.View
        {...sheetPanResponder.panHandlers}
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
            <View style={styles.swipeHint}>
              <Ionicons
                name={isSheetExpanded ? "chevron-down" : "chevron-up"}
                size={15}
                color="#20B768"
              />
              <Text style={styles.swipeHintText}>
                {isSheetExpanded ? "Swipe down" : "Swipe up"}
              </Text>
            </View>
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

          <View style={styles.detailsSection}>
            <View style={styles.detailsHeader}>
              <View style={styles.detailsIconWrap}>
                <Ionicons name="receipt-outline" size={21} color="#159A5B" />
              </View>
              <Text style={styles.detailsTitle}>Trip details</Text>
              {isReturnTrip && (
                <View style={styles.roundTripBadge}>
                  <Ionicons
                    name="repeat"
                    size={12}
                    color="#159A5B"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.roundTripBadgeText}>Round trip</Text>
                </View>
              )}
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vehicle</Text>
              <Text style={styles.detailValue}>
                {outboundTrip.selectedRide.name}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {isReturnTrip ? "Total distance" : "Distance"}
              </Text>
              <Text style={styles.detailValue}>
                {loadingRoute
                  ? "Calculating route"
                  : isReturnTrip
                    ? `${totalDistanceText} (round trip)`
                    : totalDistanceText}
              </Text>
            </View>
            <View style={styles.detailsDivider} />

            <View style={styles.routeBlock}>
              <View style={styles.routeTimeline}>
                <View style={styles.pickupPoint} />
                <View style={styles.routeLine} />
                <View style={isReturnTrip ? styles.midPoint : styles.dropoffPoint} />
                {isReturnTrip && (
                  <>
                    <View style={styles.routeLine} />
                    <View style={styles.dropoffPoint} />
                  </>
                )}
              </View>
              <View style={styles.routeContent}>
                <View style={styles.routeLocation}>
                  <Text style={styles.routeLabelPickup}>Pickup</Text>
                  <Text style={styles.locationDetailText}>
                    {outboundTrip.pickup.address}
                  </Text>
                </View>
                <View style={styles.routeLocation}>
                  <Text style={styles.routeLabelDropoff}>
                    {isReturnTrip ? "Destination" : "Drop-off"}
                  </Text>
                  <Text style={styles.locationDetailText}>
                    {outboundTrip.dropoff.address}
                  </Text>
                </View>
                {isReturnTrip && (
                  <View style={styles.routeLocation}>
                    <Text style={styles.routeLabelPickup}>
                      Return to pickup
                    </Text>
                    <Text style={styles.locationDetailText}>
                      {outboundTrip.pickup.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.detailsDivider} />
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => router.push("/ride-booking/payment-method")}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`Change payment method. Currently ${usePickuCredit ? `PickU credit plus ${paymentMethod}` : paymentMethod}`}
            >
              <View style={styles.paymentLabelWrap}>
                <Ionicons
                  name={
                    usePickuCredit
                      ? "wallet-outline"
                      : paymentMethod === "card"
                        ? "card-outline"
                        : "cash-outline"
                  }
                  size={19}
                  color="#159A5B"
                />
                <Text style={styles.detailLabel}>Payment method</Text>
              </View>
              <View style={styles.paymentValueWrap}>
                <Text style={styles.detailValue}>
                  {usePickuCredit
                    ? `CREDIT + ${paymentMethod.toUpperCase()}`
                    : paymentMethod === "card" && selectedPaymentCard
                      ? `${selectedPaymentCard.brand.toUpperCase()} •••• ${selectedPaymentCard.last4}`
                      : paymentMethod.toUpperCase()}
                </Text>
                <Ionicons name="chevron-forward" size={17} color="#64748B" />
              </View>
            </TouchableOpacity>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total amount</Text>
              <Text style={styles.totalValue}>LKR {totalPrice.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { ...StyleSheet.absoluteFillObject },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FAFBFB",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    height: EXPANDED_SHEET_HEIGHT,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    marginBottom: 16,
  },
  sheetContent: { width: "100%", paddingBottom: 12 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 21, fontWeight: "800", color: "#111827" },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECF9F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  swipeHintText: { fontSize: 13, fontWeight: "700", color: "#159A5B" },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 20,
    marginBottom: 16,
    gap: 13,
    borderWidth: 1,
    borderColor: "#EEF1F3",
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  pickupDotWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EAF8F1",
    alignItems: "center",
    justifyContent: "center",
  },
  addressTextWrap: { flex: 1 },
  addressMain: { fontSize: 17, fontWeight: "800", color: "#111827" },
  addressSub: { fontSize: 14, color: "#6B7280", marginTop: 3 },
  confirmBtn: {
    backgroundColor: "#20B768",
    paddingVertical: 17,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 14,
    elevation: 4,
    shadowColor: "#159A5B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  detailsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EEF1F3",
    padding: 16,
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 16,
  },
  detailsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAF8F1",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 11,
    alignItems: "center",
    gap: 16,
  },
  detailLabel: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 1,
    textAlign: "right",
  },
  detailsDivider: { height: 1, backgroundColor: "#EEF1F3", marginVertical: 11 },
  routeBlock: { flexDirection: "row", gap: 12 },
  routeTimeline: { width: 16, alignItems: "center", paddingVertical: 5 },
  pickupPoint: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#20B768",
  },
  routeLine: {
    width: 1,
    flex: 1,
    minHeight: 35,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: "#9CA3AF",
  },
  dropoffPoint: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    backgroundColor: "#FFFFFF",
  },
  midPoint: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#F97316",
    backgroundColor: "#FFFFFF",
  },
  roundTripBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F8F0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: "auto",
  },
  roundTripBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#159A5B",
  },
  routeContent: { flex: 1, gap: 13 },
  routeLocation: { gap: 3 },
  routeLabelPickup: { fontSize: 14, fontWeight: "700", color: "#159A5B" },
  routeLabelDropoff: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  locationDetailText: { fontSize: 14, color: "#1F2937", lineHeight: 19 },
  paymentLabelWrap: { flexDirection: "row", alignItems: "center", gap: 9 },
  paymentValueWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E8F8F0",
    borderRadius: 17,
    padding: 15,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, color: "#0B3D2E", fontWeight: "800" },
  totalValue: { fontSize: 17, fontWeight: "800", color: "#20B768" },
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
  backButtonText: { color: "#fff", fontWeight: "600" },
});
