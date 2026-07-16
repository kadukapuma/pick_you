import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getCachedDirections_withCache,
  type DirectionsResult,
} from "../../services/maps/directionsApi";
import { useRideSearch, type RideOption } from "../../state/booking/RideBookingContext";
import { apiClient } from "../../services/api/client";
import GoogleRideMap from "../../features/ride-booking/map/GoogleRideMap";
import { createMockNearbyVehicles } from "../../features/ride-booking/map/mockNearbyVehicles";
import { logExpectedError } from "../../services/errors/userMessages";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DBVehicleType {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  fare_config: {
    id: number;
    vehicle_type: string;
    base_fare: string;
    per_km_rate: string;
    per_minute_rate: string;
    cancellation_fee: string;
    is_active: boolean;
  } | null;
}

interface RideEstimateResponse {
  route: DirectionsResult;
  estimated_fare: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GREEN = "#20B768";
const GREEN_LIGHT = "#E8F8F0";
const GREEN_DARK = "#178A50";

const MOCK_VEHICLE_TYPES: DBVehicleType[] = [
  {
    id: 1,
    name: "car",
    display_name: "Car",
    description: "Standard 4-seater cars and hatchbacks",
    is_active: true,
    fare_config: {
      id: 1,
      vehicle_type: "car",
      base_fare: "150.00",
      per_km_rate: "80.00",
      per_minute_rate: "5.00",
      cancellation_fee: "50.00",
      is_active: true,
    },
  },
  {
    // Fixed: removed the extra 'a' character
    id: 2,
    name: "tuk",
    display_name: "Tuk Tuk",
    description: "Classic 3-wheeler auto rickshaws",
    is_active: true,
    fare_config: {
      id: 2,
      vehicle_type: "tuk",
      base_fare: "100.00",
      per_km_rate: "60.00",
      per_minute_rate: "5.00",
      cancellation_fee: "50.00",
      is_active: true,
    },
  },
  {
    id: 3,
    name: "bike",
    display_name: "Motorbike",
    description: "Fast single-passenger motorbikes",
    is_active: true,
    fare_config: {
      id: 3,
      vehicle_type: "bike",
      base_fare: "80.00",
      per_km_rate: "40.00",
      per_minute_rate: "5.00",
      cancellation_fee: "50.00",
      is_active: true,
    },
  },
  {
    id: 4,
    name: "suv",
    display_name: "SUV",
    description: "Large 6-seater family vehicles",
    is_active: true,
    fare_config: {
      id: 4,
      vehicle_type: "suv",
      base_fare: "200.00",
      per_km_rate: "100.00",
      per_minute_rate: "5.00",
      cancellation_fee: "50.00",
      is_active: true,
    },
  },
];

const ICON_MAP: Record<string, "car" | "bicycle" | "bus"> = {
  car: "car",
  tuk: "car",
  tuktuk: "car",
  threewheel: "car",
  bike: "bicycle",
  motorbike: "bicycle",
  motorcycle: "bicycle",
  suv: "bus",
  van: "bus",
  minivan: "bus",
  minicar: "car",
  mini: "car",
};

// Normalise any backend vehicle name to a consistent key
function normaliseVehicleKey(raw: string): string {
  return raw.toLowerCase().replace(/[\s_\-]+/g, "");
}

const VEHICLE_IMAGE_MAP: Record<string, any> = {
  car: require("../../assets/images/vehicles/car.png"),
  tuk: require("../../assets/images/vehicles/threewheel.png"),
  tuktuk: require("../../assets/images/vehicles/threewheel.png"),
  threewheel: require("../../assets/images/vehicles/threewheel.png"),
  bike: require("../../assets/images/vehicles/bike.png"),
  motorbike: require("../../assets/images/vehicles/bike.png"),
  motorcycle: require("../../assets/images/vehicles/bike.png"),
  suv: require("../../assets/images/vehicles/minivan.png"),
  van: require("../../assets/images/vehicles/van.png"),
  minivan: require("../../assets/images/vehicles/van.png"),
  minicar: require("../../assets/images/vehicles/minicar.png"),
  mini: require("../../assets/images/vehicles/minicar.png"),
};

function getVehicleImage(id: string) {
  const key = normaliseVehicleKey(id);
  return VEHICLE_IMAGE_MAP[key] ?? VEHICLE_IMAGE_MAP.car;
}

const ETA_MAP: Record<string, string> = {
  bike: "1 min",
  motorbike: "1 min",
  motorcycle: "1 min",
  tuk: "2 mins",
  tuktuk: "2 mins",
  threewheel: "2 mins",
  minicar: "2 mins",
  mini: "2 mins",
  car: "3 mins",
  suv: "5 mins",
  van: "5 mins",
  minivan: "5 mins",
};
const RATING_MAP: Record<string, number> = {
  bike: 4.5,
  motorbike: 4.5,
  motorcycle: 4.5,
  tuk: 4.7,
  tuktuk: 4.7,
  threewheel: 4.7,
  car: 4.8,
  minicar: 4.8,
  mini: 4.8,
  suv: 4.9,
  van: 4.9,
  minivan: 4.9,
};
// Approx stars earned per LKR spent
const STARS_PER_LKR = 0.01;

function mapDBVehicleToOption(
  vt: DBVehicleType,
  distanceMeters: number,
  durationSeconds: number,
): RideOption {
  let price = 0;
  if (vt.fare_config) {
    const { base_fare, per_km_rate, per_minute_rate } = vt.fare_config;
    price =
      parseFloat(base_fare) +
      (distanceMeters / 1000) * parseFloat(per_km_rate) +
      (durationSeconds / 60) * parseFloat(per_minute_rate);
  } else {
    price = 150 + (distanceMeters / 1000) * 60;
  }
  
  const safeName = normaliseVehicleKey(vt.name ?? "car");
  
  return {
    id: vt.name, // Keep original for backend queries
    name: vt.display_name,
    icon: ICON_MAP[safeName] ?? "car",
    price: parseFloat(price.toFixed(2)),
    eta: ETA_MAP[safeName] ?? "4 mins",
    rating: RATING_MAP[safeName] ?? 4.6,
  };
}

// ─── Animated ride card ───────────────────────────────────────────────────────
type RideCardProps = {
  ride: RideOption;
  selected: boolean;
  onSelect: () => void;
  index: number;
  directions: DirectionsResult | null;
};

function RideCard({
  ride,
  selected,
  onSelect,
  index,
  directions,
}: RideCardProps) {
  const scale = useRef(new Animated.Value(selected ? 1 : 0.97)).current;
  const borderAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;

  // Staggered entrance
  const entranceY = useRef(new Animated.Value(10)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 160,
        delay: Math.min(index * 35, 90),
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(entranceY, {
        toValue: 0,
        duration: 160,
        delay: Math.min(index * 35, 90),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Selection animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: selected ? 1 : 0.97,
        useNativeDriver: true,
        damping: 16,
        stiffness: 200,
      }),
      Animated.timing(borderAnim, {
        toValue: selected ? 1 : 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [selected]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#E5E7EB", GREEN],
  });

  const stars = (ride.price * STARS_PER_LKR).toFixed(1);

  return (
    <Animated.View
      style={{
        opacity: entranceOpacity,
        transform: [{ translateY: entranceY }, { scale }],
      }}
    >
      <Pressable onPress={onSelect} style={{ borderRadius: 16 }}>
        <Animated.View
          style={[
            styles.rideCard,
            { borderColor },
            selected && { backgroundColor: "#F3F4F6" },
          ]}
        >
          {/* Icon area */}
          <View style={styles.cardIconWrap}>
            <Image
              source={getVehicleImage(ride.id ?? "car")}
              style={{ width: 85, height: 46, resizeMode: "contain" }}
            />
          </View>

          {/* Name */}
          <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit>
            {ride.name}
          </Text>

          {/* ETA */}
          <View style={styles.cardMeta}>
            <Ionicons name="person-outline" size={11} color="#9CA3AF" />
            <Text style={styles.cardEta} numberOfLines={1}>
              {ride.eta}
            </Text>
          </View>

          {/* Price */}
          <Text
            style={styles.cardPrice}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            LKR {ride.price.toFixed(2)}
          </Text>

          {/* Stars earned */}
          <View style={styles.starsRow}>
            <Ionicons name="star" size={11} color="#FBBF24" />
            <Text style={styles.starsText} numberOfLines={1}>
              Earn {stars}
            </Text>
          </View>

          {/* Route info */}
          {directions && (
            <Text style={styles.cardRoute} numberOfLines={1}>
              {directions.distanceText} · {directions.durationText}
            </Text>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SelectRideScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { tripType, setOutboundRide, setOutboundPickup, setOutboundDropoff } =
    useRideSearch();

  const [selectedRide, setSelectedRide] = useState<string | null>(null);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const insets = useSafeAreaInsets();
  const pickup = JSON.parse(params.pickup as string);
  const destination = JSON.parse(params.destination as string);

  // Bottom sheet slide-up entrance
  const sheetY = useRef(new Animated.Value(80)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const animateSheetIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    animateSheetIn();
  }, [animateSheetIn]);

  // Fetch directions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRoute(true);
      try {
        const result = await getCachedDirections_withCache(
          pickup.latitude,
          pickup.longitude,
          destination.latitude,
          destination.longitude,
        );
        if (!cancelled) setDirections(result);
      } catch (e) {
        logExpectedError("Vehicle selection route lookup failed", e);
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch vehicles
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingVehicles(true);
      try {
        const res = await apiClient.get<DBVehicleType[]>(
          "/vehicle-types?active_only=1&available_only=1",
        );
        const data =
          res.success && Array.isArray(res.data)
            ? res.data.filter((v) => v.is_active && v.fare_config?.is_active)
            : MOCK_VEHICLE_TYPES;
        if (!cancelled) {
          _setRawVehicles(data);
          setLoadingVehicles(false);
        }
      } catch {
        if (!cancelled) {
          _setRawVehicles(MOCK_VEHICLE_TYPES);
          setLoadingVehicles(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [_rawVehicles, _setRawVehicles] = useState<DBVehicleType[]>([]);

  // Compute local fares first, then refine with backend estimates in the background.
  useEffect(() => {
    if (!directions || _rawVehicles.length === 0) return;

    let cancelled = false;
    const fallbackOptions = _rawVehicles.map((vehicle) =>
      mapDBVehicleToOption(vehicle, directions.distance, directions.duration),
    );

    setRideOptions(fallbackOptions);
    setSelectedRide((current) => current ?? fallbackOptions[0]?.id ?? null);
    setLoadingVehicles(false);

    const loadBackendEstimates = async () => {
      await Promise.all(
        _rawVehicles.map(async (vehicle) => {
          const fallback = fallbackOptions.find((option) => option.id === vehicle.name);
          if (!fallback) return;

          try {
            const estimate = await apiClient.post<RideEstimateResponse>(
              "/rides/estimate",
              {
                vehicle_type: vehicle.name,
                pickup_lat: pickup.latitude,
                pickup_lng: pickup.longitude,
                drop_lat: destination.latitude,
                drop_lng: destination.longitude,
              },
            );

            if (cancelled || !estimate.success || !estimate.data) return;

            const apiFare = Number(estimate.data.estimated_fare);
            const sane = apiFare > 0 && apiFare < fallback.price * 10;
            if (!sane) return;

            setRideOptions((current) =>
              current.map((option) =>
                option.id === vehicle.name
                  ? { ...option, price: parseFloat(apiFare.toFixed(2)) }
                  : option,
              ),
            );
          } catch {
            // The local fare config estimate remains usable if backend estimate is slow.
          }
        }),
      );
    };

    loadBackendEstimates();

    return () => {
      cancelled = true;
    };
  }, [destination.latitude, destination.longitude, directions, pickup.latitude, pickup.longitude, _rawVehicles]);
  const handleBookNow = useCallback(() => {
    if (!selectedRide || rideOptions.length === 0) return;
    const opt = rideOptions.find((r) => r.id === selectedRide);
    if (!opt) return;
    setOutboundPickup(pickup);
    setOutboundDropoff(destination);
    setOutboundRide(opt);
    router.push(
      tripType === "return"
        ? "/ride-booking/return-location"
        : "/ride-booking/confirm",
    );
  }, [selectedRide, rideOptions]);

  const hasPendingFareSetup = Boolean(directions && _rawVehicles.length > 0 && rideOptions.length === 0);
  const loading = loadingRoute || loadingVehicles || hasPendingFareSetup;
  const nearbyVehicles = useMemo(
    () => createMockNearbyVehicles(pickup, selectedRide),
    [pickup, selectedRide],
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── MAP ──────────────────────────────────────────────────────────── */}
      <GoogleRideMap
        style={styles.map}
        pickup={pickup}
        dropoff={destination}
        routeCoordinates={
          directions && directions.polyline.length > 0
            ? directions.polyline
            : [pickup, destination]
        }
        routeColor={GREEN}
        pickupColor={GREEN}
        nearbyVehicles={nearbyVehicles}
        fitEdgePadding={{ top: 120, right: 80, bottom: 430, left: 80 }}
        dropoffColor="#F97316"
      />

      {/* ── BACK BUTTON ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={20} color="#111827" />
      </TouchableOpacity>

      {/* ── ROUTE PILL ──────────────────────────────────────────────────── */}
      {!loadingRoute && directions && (
        <View style={styles.routePill}>
          <Ionicons name="navigate" size={14} color={GREEN} />
          <Text style={styles.routePillText}>
            {directions.distanceText} · {directions.durationText}
          </Text>
        </View>
      )}
      {loadingRoute && (
        <View style={styles.routePill}>
          <ActivityIndicator size="small" color={GREEN} />
          <Text style={styles.routePillText}>Getting route…</Text>
        </View>
      )}

      {/* ── BOTTOM SHEET ─────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.sheet,
          {
            opacity: sheetOpacity,
            transform: [{ translateY: sheetY }],
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Title row */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Choose a Ride</Text>
          {!loading && directions && (
            <View style={styles.fareNote}>
              <Ionicons
                name="information-circle-outline"
                size={13}
                color="#9CA3AF"
              />
              <Text style={styles.fareNoteText}>Dynamic fares</Text>
            </View>
          )}
        </View>

        {/* ── RIDE CARDS ─────────────────────────────────────────────────── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.loadingText}>Calculating fares…</Text>
          </View>
        ) : rideOptions.length === 0 ? (
          <View style={styles.loadingBox}>
            <Ionicons name="alert-circle-outline" size={30} color="#EF4444" />
            <Text style={[styles.loadingText, { color: "#EF4444" }]}>
              No vehicles available
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
            style={styles.cardsScroll}
          >
            {rideOptions.map((ride, i) => (
              <RideCard
                key={ride.id}
                ride={ride}
                selected={selectedRide === ride.id}
                onSelect={() => setSelectedRide(ride.id)}
                index={i}
                directions={directions}
              />
            ))}
          </ScrollView>
        )}

        {/* ── OPTIONS ROW ────────────────────────────────────────────────── */}
        <View style={styles.optionsRow}>
          <TouchableOpacity style={styles.optionChip}>
            <Ionicons name="cash-outline" size={16} color={GREEN} />
            <Text style={styles.optionChipText}>Cash</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionChip}>
            <Ionicons name="pencil-outline" size={15} color="#6B7280" />
            <Text style={[styles.optionChipText, { color: "#6B7280" }]}>
              Add note
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionChip}>
            <Ionicons name="ticket-outline" size={15} color="#6B7280" />
            <Text style={[styles.optionChipText, { color: "#6B7280" }]}>
              Add Promo
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── BOOK BUTTON ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.bookBtn,
            (!selectedRide || loading) && styles.bookBtnDisabled,
          ]}
          onPress={handleBookNow}
          disabled={!selectedRide || loading}
          activeOpacity={0.82}
        >
          <Text style={styles.bookBtnText}>
            {tripType === "return" ? "Continue to Return →" : "Book Now"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FBFF" },

  map: { flex: 1 },

  // ── Map overlays ────────────────────────────────────────────────────────────
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : (StatusBar.currentHeight ?? 24) + 12,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },

  routePill: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : (StatusBar.currentHeight ?? 24) + 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 5 },
    }),
  },

  routePillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  // ── Bottom sheet ────────────────────────────────────────────────────────────
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 14 },
    }),
  },

  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 14,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  fareNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  fareNoteText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // ── Loading ─────────────────────────────────────────────────────────────────
  loadingBox: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  loadingText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },

  // ── Ride cards ──────────────────────────────────────────────────────────────
  cardsScroll: {
    marginHorizontal: -16,
  },

  cardsRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },

  rideCard: {
    width: 112,
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  rideCardSelected: {
    backgroundColor: "#F3F4F6",
    borderColor: GREEN,
  },

  cardIconWrap: {
    width: "100%",
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  cardName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },

  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  cardEta: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  cardPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },

  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },

  starsText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },

  cardRoute: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 2,
    textAlign: "center",
  },

  // ── Options row ─────────────────────────────────────────────────────────────
  optionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },

  optionChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },

  optionChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: GREEN,
  },

  // ── Book button ─────────────────────────────────────────────────────────────
  bookBtn: {
    backgroundColor: GREEN,
    paddingVertical: 15,
    borderRadius: 22,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: GREEN,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },

  bookBtnDisabled: {
    opacity: 0.45,
  },

  bookBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
});








