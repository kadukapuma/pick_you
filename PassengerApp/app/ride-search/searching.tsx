import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRideSearch } from "../../context/RideSearchContext";
import { apiClient } from "../../services/api/apiClient";
import { subscribeToRideLocation } from "../../services/location/trackingService";
import GoogleRideMap from "../../components/map/GoogleRideMap";

const GREEN = "#20B768";
const DARK_GREEN = "#0b9e54";
const { height: SCREEN_H } = Dimensions.get("window");

// ─── Helpers ────────────────────────────────────────────────────────────────
const mergeRideData = (previous: any, next: any) => {
  const merged = {
    ...(previous || {}),
    ...(next || {}),
    vehicle_type:
      next?.vehicle_type ||
      next?.fare_config?.vehicle_type ||
      next?.fareConfig?.vehicle_type ||
      next?.vehicle?.vehicle_type ||
      next?.vehicle?.vehicleType?.name ||
      previous?.vehicle_type,
  };

  // Deep-preserve driver.user: the broadcast event loads it, but the
  // HTTP poll (/rides/{id}) does not — so never overwrite a known user
  // with a null/absent one.
  if (previous?.driver?.user && !next?.driver?.user) {
    merged.driver = {
      ...(merged.driver || {}),
      user: previous.driver.user,
    };
  }

  // Same for vehicle details: keep them if poll returns vehicle without fields.
  if (previous?.vehicle && next?.vehicle && !next.vehicle.brand && previous.vehicle.brand) {
    merged.vehicle = {
      ...previous.vehicle,
      ...next.vehicle,
    };
  }

  return merged;
};

function getDriverName(rideData: any): string {
  // Backend: driver → user { first_name, last_name }
  const user = rideData?.driver?.user;
  if (user) {
    const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
    if (full.trim()) return full.trim();
  }
  return (
    rideData?.driver?.name ||
    rideData?.driverName ||
    "Your Driver"
  );
}

function getDriverRating(rideData: any): string {
  const r =
    rideData?.driver?.rating ||
    rideData?.driver?.average_rating ||
    rideData?.driverRating;
  return r ? parseFloat(r).toFixed(1) : "4.8";
}

function getPlateNumber(rideData: any): string {
  // Backend Vehicle model field is `vehicle_number`
  return (
    rideData?.vehicle?.vehicle_number ||
    rideData?.vehicle?.plate_number ||
    rideData?.driver?.vehicle?.vehicle_number ||
    rideData?.vehicle_number ||
    ""
  );
}

function getVehicleDesc(rideData: any): string {
  // Backend: Ride->vehicle is a direct relation with fields: brand, model, color, vehicle_type (appended)
  const vehicle = rideData?.vehicle;
  const brand = vehicle?.brand || "";
  const model = vehicle?.model || "";
  const color = vehicle?.color || "";
  const type = vehicle?.vehicle_type || rideData?.vehicle_type || "";
  const parts = [color, brand, model, type].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Standard Vehicle";
}

function getEta(rideData: any): string {
  const mins =
    rideData?.eta_minutes ||
    rideData?.etaMinutes ||
    rideData?.pickup_eta ||
    rideData?.driver?.eta_minutes;
  return mins ? `${Math.round(mins)} min to pickup` : "On the way";
}

// ─── Tip amounts ─────────────────────────────────────────────────────────────
const TIP_AMOUNTS = [0, 50, 100, 150, 200, 250, 500];

// ─── Collapsed sheet height ───────────────────────────────────────────────────
const COLLAPSED_H = 190;
const EXPANDED_H = SCREEN_H * 0.92;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SearchingScreen() {
  const params = useLocalSearchParams();
  const initialRideData = useMemo(
    () => (params.rideData ? JSON.parse(params.rideData as string) : null),
    [params.rideData]
  );
  const [rideData, setRideData] = useState<any>(initialRideData);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedTip, setSelectedTip] = useState(0);
  const alertShownRef = useRef(false);
  const rideId = Number(rideData?.id || initialRideData?.id || 0);
  const insets = useSafeAreaInsets();
  const { setActiveRide, setIsSearchingForDriver, resetTrip, outboundTrip } =
    useRideSearch();

  const rideStatus = String(rideData?.status || "REQUESTED").toUpperCase();
  const isAccepted = ["ACCEPTED", "ARRIVED", "STARTED"].includes(rideStatus);

  // ── Search animations ────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
    Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 4,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  // ── Driver bottom sheet animation ─────────────────────────────────────────
  const sheetAnim = useRef(new Animated.Value(0)).current; // 0=hidden, 1=collapsed, 2=expanded
  const sheetHeight = useRef(new Animated.Value(COLLAPSED_H)).current;
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandedRef = useRef(false);

  const expandSheet = useCallback(() => {
    isExpandedRef.current = true;
    setIsExpanded(true);
    Animated.spring(sheetHeight, {
      toValue: EXPANDED_H,
      useNativeDriver: false,
      damping: 20,
      stiffness: 160,
    }).start();
  }, [sheetHeight]);

  const collapseSheet = useCallback(() => {
    isExpandedRef.current = false;
    setIsExpanded(false);
    Animated.spring(sheetHeight, {
      toValue: COLLAPSED_H,
      useNativeDriver: false,
      damping: 20,
      stiffness: 160,
    }).start();
  }, [sheetHeight]);

  const slideInSheet = useCallback(() => {
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [sheetAnim]);

  // slide in when driver found
  useEffect(() => {
    if (isAccepted) slideInSheet();
  }, [isAccepted]);

  // ── PanResponder for drag gestures ────────────────────────────────────────
  const dragStartY = useRef(0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4,
      onPanResponderGrant: (_, gs) => {
        dragStartY.current = gs.y0;
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -50) {
          // Swipe up → expand
          expandSheet();
        } else if (gs.dy > 50) {
          // Swipe down → collapse
          collapseSheet();
        }
      },
    })
  ).current;

  // ── Ride polling ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const acceptRideUpdate = (ride: any) => {
      if (cancelled || !ride) return;
      const status = String(ride.status || "").toUpperCase();
      setRideData((previous: any) => mergeRideData(previous, ride));
      setActiveRide(rideId, status);
      if (["ACCEPTED", "ARRIVED", "STARTED"].includes(status)) {
        setIsSearchingForDriver(false);
        if (!alertShownRef.current) {
          alertShownRef.current = true;
        }
      }
    };

    subscribeToRideLocation(rideId, () => {}, undefined, acceptRideUpdate)
      .then((cleanup) => { unsubscribe = cleanup; })
      .catch((e) => console.log("Realtime setup failed:", e));

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

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleShowDriver = () => {
    if (!rideData) return;
    router.replace({
      pathname: "/live-tracker",
      params: { rideData: JSON.stringify(rideData) },
    });
  };

  const handleCancel = async () => {
    if (!rideId || isCancelling || isAccepted) return;
    Alert.alert("Cancel Ride", "Are you sure you want to cancel this ride?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          setIsCancelling(true);
          const response = await apiClient.delete(`/rides/${rideId}`);
          setIsCancelling(false);
          if (response.success) {
            resetTrip();
            router.replace("/(drawer)/(tabs)/home");
            return;
          }
          Alert.alert("Cancel failed", response.message || "Please try again.");
        },
      },
    ]);
  };

  const handleBookAnother = () => {
    resetTrip();
    router.replace("/(drawer)/(tabs)/home");
  };

  // ── Progress segments ─────────────────────────────────────────────────────
  const ProgressSegments = () => (
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
              style={[styles.segmentFill, { width: widthVal, opacity }]}
            />
          </View>
        );
      })}
    </View>
  );

  const pickupCoord = outboundTrip.pickup || { latitude: 6.9271, longitude: 79.8612 };
  const driverName = getDriverName(rideData);
  const driverRating = getDriverRating(rideData);
  const plateNumber = getPlateNumber(rideData);
  const vehicleDesc = getVehicleDesc(rideData);
  const eta = getEta(rideData);
  const pickupAddress = outboundTrip.pickup?.address || "Pickup Location";
  const dropoffAddress = outboundTrip.dropoff?.address || "Destination";

  // ── Sheet translateY (slides up from bottom) ──────────────────────────────
  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLLAPSED_H + 40, 0],
    extrapolate: "clamp",
  });

  // ── Status header color ───────────────────────────────────────────────────
  const statusLabel =
    rideStatus === "ARRIVED"
      ? "Driver is here!"
      : rideStatus === "STARTED"
      ? "Trip in progress"
      : "Driver is on the way";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* ── MAP BACKGROUND ────────────────────────────────────────────── */}
      <View style={styles.mapWrap}>
        <GoogleRideMap
          style={styles.map}
          pickup={pickupCoord}
          dropoff={pickupCoord}
          routeCoordinates={[]}
        />
        {!isAccepted && (
          <>
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
          </>
        )}
      </View>

      {/* ── TOP BAR ───────────────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.pillBtn} onPress={handleBookAnother}>
          <Text style={styles.pillBtnText}>Book Another Ride</Text>
        </TouchableOpacity>
        {!isAccepted && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── SEARCHING BOTTOM SHEET (shown when !isAccepted) ──────────── */}
      {!isAccepted && (
        <View style={[styles.searchSheet, { paddingBottom: insets.bottom + 26 }]}>
          <View style={styles.sheetTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Searching nearby drivers...</Text>
            </View>
            <View style={styles.roundIcon}>
              <Ionicons name="person" size={24} color="#6B7280" />
              <View style={styles.magnifierWrap}>
                <Ionicons name="search" size={12} color={GREEN} />
              </View>
            </View>
          </View>
          <ProgressSegments />
          <View style={styles.footerRow}>
            <Text style={styles.footerSub}>Select multiple vehicle types</Text>
            <TouchableOpacity style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again now</Text>
              <Ionicons name="chevron-down" size={16} color="#B45309" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── DRIVER FOUND BOTTOM SHEET ─────────────────────────────────── */}
      {isAccepted && (
        <Animated.View
          style={[
            styles.driverSheet,
            {
              height: sheetHeight,
              transform: [{ translateY: sheetTranslateY }],
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          {/* Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          {/* ── COLLAPSED VIEW (always visible) ── */}
          <View style={styles.collapsedCard}>
            {/* Status header */}
            <View style={styles.statusHeaderRow}>
              <View>
                <Text style={styles.driverStatusTitle}>{statusLabel}</Text>
                <Text style={styles.driverEta}>{eta}</Text>
              </View>
            </View>

            <View style={styles.driverRow}>
              {/* Avatar */}
              <View style={styles.avatarWrap}>
                <Ionicons name="person-circle" size={52} color="#CBD5E1" />
              </View>

              {/* Vehicle icon */}
              <View style={styles.vehicleIconWrap}>
                <Ionicons name="car" size={28} color="#374151" />
              </View>

              {/* Plate + description */}
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Text style={styles.plateText}>{plateNumber}</Text>
                <Text style={styles.vehicleDescText} numberOfLines={1}>
                  {vehicleDesc}
                </Text>
              </View>

              {/* Action buttons */}
              <View style={styles.actionBtns}>
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
                  <Ionicons name="call" size={20} color={DARK_GREEN} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
                  <Ionicons name="chatbubble-ellipses" size={20} color={DARK_GREEN} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Driver name + rating */}
            <View style={styles.nameRow}>
              <Text style={styles.driverNameText}>{driverName}</Text>
              <View style={styles.ratingWrap}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>{driverRating}</Text>
              </View>
            </View>
          </View>

          {/* ── EXPANDED VIEW (scrollable) ───────────────────────────── */}
          {isExpanded && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.expandedContent}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => {
                if (e.nativeEvent.contentOffset.y < -20) collapseSheet();
              }}
            >
              {/* Trip details card */}
              <View style={styles.tripCard}>
                <View style={styles.tripCardHeader}>
                  <Text style={styles.tripCardTitle}>Trip details</Text>
                </View>

                <View style={styles.tripRow}>
                  <View style={styles.upChip}>
                    <Ionicons name="chevron-up" size={14} color="#FFFFFF" />
                  </View>
                  <Text style={styles.tripAddressText} numberOfLines={1}>
                    {pickupAddress}
                  </Text>
                </View>

                <View style={[styles.tripRow, { marginTop: 12 }]}>
                  <View style={styles.numChip}>
                    <Text style={styles.numChipText}>1</Text>
                  </View>
                  <Text style={styles.tripAddressText} numberOfLines={1}>
                    {dropoffAddress}
                  </Text>
                </View>
              </View>

              {/* Cancel button */}
              <TouchableOpacity
                style={styles.cancelTripBtn}
                onPress={handleCancel}
                activeOpacity={0.8}
                disabled={isCancelling}
              >
                <Text style={styles.cancelTripText}>
                  {isCancelling ? "Cancelling..." : "Cancel trip"}
                </Text>
              </TouchableOpacity>

              {/* Payment row */}
              <View style={styles.infoRow}>
                <View style={styles.infoRowLeft}>
                  <View style={[styles.infoIconWrap, { backgroundColor: "#E8F5EE" }]}>
                    <Ionicons name="cash-outline" size={18} color={DARK_GREEN} />
                  </View>
                  <Text style={styles.infoRowText}>Cash</Text>
                </View>
                <TouchableOpacity>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rowDivider} />

              {/* Promo row */}
              <View style={styles.infoRow}>
                <View style={styles.infoRowLeft}>
                  <View style={[styles.infoIconWrap, { backgroundColor: "#FEF3C7" }]}>
                    <Ionicons name="pricetag-outline" size={18} color="#D97706" />
                  </View>
                  <Text style={styles.infoRowText}>Add promo</Text>
                </View>
                <TouchableOpacity>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rowDivider} />

              {/* Tip section */}
              <View style={styles.tipSection}>
                <Text style={styles.tipTitle}>Add a tip.</Text>
                <Text style={styles.tipSub}>100% of your tip goes to the driver</Text>
                <View style={styles.tipRow}>
                  {TIP_AMOUNTS.map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.tipChip,
                        selectedTip === amount && styles.tipChipActive,
                      ]}
                      onPress={() => setSelectedTip(amount)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.tipChipText,
                          selectedTip === amount && styles.tipChipTextActive,
                        ]}
                      >
                        {amount === 0 ? "No tip" : `LKR ${amount}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* View on map CTA */}
              <TouchableOpacity
                style={styles.viewMapBtn}
                onPress={handleShowDriver}
                activeOpacity={0.88}
              >
                <Ionicons name="map-outline" size={18} color="#fff" />
                <Text style={styles.viewMapText}>View on Map</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  mapWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  map: { ...StyleSheet.absoluteFillObject },

  pulseCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(32, 183, 104, 0.25)",
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
    backgroundColor: GREEN,
    borderWidth: 3,
    borderColor: "#fff",
  },
  pickupLabel: {
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  pickupLabelText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Top Bar
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
  pillBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cancelBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 4,
  },
  cancelText: { color: "#374151", fontSize: 13, fontWeight: "700" },

  // Searching sheet
  searchSheet: {
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
  sheetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
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
  segmentsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  segmentBase: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E8F8F0",
    overflow: "hidden",
  },
  segmentFill: { height: "100%", backgroundColor: GREEN, borderRadius: 3 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },
  footerSub: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  retryText: { fontSize: 13, fontWeight: "700", color: "#B45309" },

  // Driver bottom sheet (animated)
  driverSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    overflow: "hidden",
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },

  // Collapsed card area
  collapsedCard: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  statusHeaderRow: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
  },
  driverStatusTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  driverEta: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  plateText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.5,
  },
  vehicleDescText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  actionBtns: {
    flexDirection: "row",
    gap: 10,
    marginLeft: 8,
  },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E8F5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  driverNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },

  // Expanded section
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  tripCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  tripCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  tripCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  editTripBtn: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editTripText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  upChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DARK_GREEN,
    justifyContent: "center",
    alignItems: "center",
  },
  numChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  numChipText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  tripAddressText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },

  cancelTripBtn: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  cancelTripText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  infoRowText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  changeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },

  // Tip
  tipSection: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  tipSub: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 14,
  },
  tipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tipChip: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  tipChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  tipChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  tipChipTextActive: {
    color: "#fff",
  },

  // View map button
  viewMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DARK_GREEN,
    borderRadius: 24,
    paddingVertical: 14,
    marginTop: 20,
  },
  viewMapText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
