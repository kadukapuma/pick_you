import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  fallbackRoute,
  formatDistance,
  formatDuration,
  getCachedDirections_withCache,
  type DirectionsResult,
} from "../../services/maps/directionsApi";
import {
  useRideSearch,
  type RideOption,
} from "../../state/booking/RideBookingContext";
import { apiClient } from "../../services/api/client";
import GoogleRideMap from "../../features/ride-booking/map/GoogleRideMap";
import { useNearbyVehicles } from "../../services/rides/nearbyVehicles";
import { logExpectedError } from "../../services/errors/userMessages";
import { loadRebookDraft } from "../../services/rides/rebookDraft";
import { getVehicleRideImage } from "../../utils/vehicleRideImages";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DBVehicleType {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  passenger_count: number;
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

const parseLocationParam = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const MOCK_VEHICLE_TYPES: DBVehicleType[] = [
  {
    id: 1,
    name: "car",
    display_name: "Car",
    description: "Standard 4-seater cars and hatchbacks",
    passenger_count: 4,
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
    passenger_count: 3,
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
    passenger_count: 1,
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
    passenger_count: 6,
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

// Average urban travel speed used to turn a driver's real distance into an ETA.
const AVG_VEHICLE_SPEED_KMH = 25;

function formatEtaFromDistanceMeters(distanceMeters: number): string {
  const minutes = Math.max(
    1,
    Math.round((distanceMeters / 1000 / AVG_VEHICLE_SPEED_KMH) * 60),
  );
  return minutes === 1 ? "1 min" : `${minutes} mins`;
}

function mapDBVehicleToOption(
  vt: DBVehicleType,
  nearestVehicleDistanceMeters?: number,
): RideOption {
  const safeName = normaliseVehicleKey(vt.name ?? "car");

  // Real ETA: time for the closest available driver of this vehicle type to
  // reach the passenger, based on that driver's actual distance. Falls back
  // to a rough static estimate only while no live driver of this type is nearby.
  const eta =
    nearestVehicleDistanceMeters != null
      ? formatEtaFromDistanceMeters(nearestVehicleDistanceMeters)
      : (ETA_MAP[safeName] ?? "4 mins");

  return {
    id: vt.name, // Keep original for backend queries
    name: vt.display_name,
    icon: ICON_MAP[safeName] ?? "car",
    // Price is unknown until the backend's authoritative /rides/estimate
    // response arrives (see loadBackendEstimates below) — NaN marks "not priced yet".
    price: NaN,
    eta,
    rating: RATING_MAP[safeName] ?? 4.6,
    passengerCount: vt.passenger_count ?? 4,
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
  const scale = useRef(new Animated.Value(selected ? 1.02 : 0.98)).current;
  const borderAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const liftAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;

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
        toValue: selected ? 1.02 : 0.98,
        useNativeDriver: true,
        damping: 14,
        stiffness: 220,
      }),
      Animated.spring(liftAnim, {
        toValue: selected ? 1 : 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 220,
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

  const cardLiftY = liftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });

  const shadowOpacity = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.04, 0.12],
  });

  const shadowRadius = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 7],
  });

  const elevation = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 4],
  });

  const priceReady = Number.isFinite(ride.price);
  const stars = priceReady ? (ride.price * STARS_PER_LKR).toFixed(1) : null;

  return (
    <Animated.View
      style={{
        opacity: entranceOpacity,
        zIndex: selected ? 4 : 1,
        elevation: selected ? 4 : 1,
        transform: [
          { translateY: entranceY },
          { translateY: cardLiftY },
          { scale },
        ],
      }}
    >
      <Pressable onPress={onSelect} style={{ borderRadius: 16 }}>
       <Animated.View
  style={[
    styles.rideCard,
    { borderColor },
    selected && { backgroundColor: "#F3F4F6" },
    Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity,
          shadowRadius,
        }
      : { elevation },
  ]}
>
  {/* ETA badge — top-right corner */}
  <View style={styles.etaBadge}>
    <Ionicons name="time-outline" size={10} color={GREEN_DARK} />
    <Text style={styles.etaBadgeText} numberOfLines={1}>
      {ride.eta}
    </Text>
  </View>

  {/* Icon */}
  <View style={styles.cardIconWrap}>
    <Image
      source={getVehicleRideImage(ride.id)}
      style={{ width: 78, height: 42, resizeMode: "contain" }}
    />
  </View>

  {/* Name */}
  <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit>
    {ride.name}
  </Text>

          {/* Passenger seat count (from backend) */}
          <View style={styles.cardMeta}>
            <Ionicons name="person-outline" size={11} color="#9CA3AF" />
            <Text style={styles.cardEta} numberOfLines={1}>
              {ride.passengerCount} seats
            </Text>
          </View>

  {/* Price */}
  <Text
    style={styles.cardPrice}
    numberOfLines={1}
    adjustsFontSizeToFit
    minimumFontScale={0.6}
  >
    {priceReady ? `LKR ${ride.price.toFixed(2)}` : "Calculating…"}
  </Text>

  {/* Stars earned */}
  {priceReady && (
    <View style={styles.starsRow}>
      <Ionicons name="star" size={11} color="#FBBF24" />
      <Text style={styles.starsText} numberOfLines={1}>
        Earn {stars}
      </Text>
    </View>
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
  const {
    tripType,
    outboundTrip,
    paymentMethod,
    selectedPaymentCard,
    usePickuCredit,
    setOutboundRide,
    setOutboundPickup,
    setOutboundDropoff,
  } = useRideSearch();

  const [selectedRide, setSelectedRide] = useState<string | null>(null);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  // For a return trip: the destination -> pickup leg, so distance/fare/map
  // reflect the whole out-and-back trip, not just the outbound half.
  const [returnDirections, setReturnDirections] =
    useState<DirectionsResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [savedRoute, setSavedRoute] = useState<{
    pickup: any;
    destination: any;
  } | null>(null);

  const pickupParam = Array.isArray(params.pickup)
    ? params.pickup[0]
    : params.pickup;
  const destinationParam = Array.isArray(params.destination)
    ? params.destination[0]
    : params.destination;
  const pickupFromParams = React.useMemo(
    () => parseLocationParam(pickupParam),
    [pickupParam],
  );
  const destinationFromParams = React.useMemo(
    () => parseLocationParam(destinationParam),
    [destinationParam],
  );
  const pickup = React.useMemo(
    () => pickupFromParams || outboundTrip.pickup || savedRoute?.pickup || null,
    [outboundTrip.pickup, pickupFromParams, savedRoute?.pickup],
  );
  const destination = React.useMemo(
    () =>
      destinationFromParams ||
      outboundTrip.dropoff ||
      savedRoute?.destination ||
      null,
    [destinationFromParams, outboundTrip.dropoff, savedRoute?.destination],
  );
  const pickupLatitude = pickup?.latitude;
  const pickupLongitude = pickup?.longitude;
  const destinationLatitude = destination?.latitude;
  const destinationLongitude = destination?.longitude;

  // All available vehicles near the pickup point (unfiltered by type), used to
  // derive a real per-vehicle-type ETA from the closest driver's actual distance.
  const allNearbyVehicles = useNearbyVehicles(pickup, null);

  const nearestDistanceByType = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const vehicle of allNearbyVehicles) {
      if (vehicle.distanceMeters == null) continue;
      const key = normaliseVehicleKey(vehicle.vehicleType);
      if (map[key] == null || vehicle.distanceMeters < map[key]) {
        map[key] = vehicle.distanceMeters;
      }
    }
    return map;
  }, [allNearbyVehicles]);

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

  useEffect(() => {
    if (pickup && destination) return;
    let cancelled = false;

    loadRebookDraft().then((draft) => {
      if (cancelled || !draft) return;
      setSavedRoute({ pickup: draft.pickup, destination: draft.destination });
      setOutboundPickup(draft.pickup);
      setOutboundDropoff(draft.destination);
    });

    return () => {
      cancelled = true;
    };
  }, [destination, pickup, setOutboundDropoff, setOutboundPickup]);

  // Fetch directions
  useEffect(() => {
    if (
      !Number.isFinite(Number(pickupLatitude)) ||
      !Number.isFinite(Number(pickupLongitude)) ||
      !Number.isFinite(Number(destinationLatitude)) ||
      !Number.isFinite(Number(destinationLongitude))
    ) {
      setLoadingRoute(false);
      return;
    }
    let cancelled = false;
    const isReturn = tripType === "return";
    (async () => {
      setLoadingRoute(true);
      const fallback = fallbackRoute(
        Number(pickupLatitude),
        Number(pickupLongitude),
        Number(destinationLatitude),
        Number(destinationLongitude),
      );
      setDirections(fallback);
      if (isReturn) {
        setReturnDirections(
          fallbackRoute(
            Number(destinationLatitude),
            Number(destinationLongitude),
            Number(pickupLatitude),
            Number(pickupLongitude),
          ),
        );
      }
      setLoadingRoute(false);
      try {
        const [result, returnResult] = await Promise.all([
          getCachedDirections_withCache(
            Number(pickupLatitude),
            Number(pickupLongitude),
            Number(destinationLatitude),
            Number(destinationLongitude),
          ),
          isReturn
            ? getCachedDirections_withCache(
                Number(destinationLatitude),
                Number(destinationLongitude),
                Number(pickupLatitude),
                Number(pickupLongitude),
              )
            : Promise.resolve(null),
        ]);
        if (!cancelled && result) setDirections(result);
        if (!cancelled && isReturn && returnResult)
          setReturnDirections(returnResult);
      } catch (e) {
        logExpectedError("Vehicle selection route lookup failed", e);
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    destinationLatitude,
    destinationLongitude,
    pickupLatitude,
    pickupLongitude,
    tripType,
  ]);

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
    const isReturn = tripType === "return";
    if (
      !directions ||
      (isReturn && !returnDirections) ||
      _rawVehicles.length === 0 ||
      !Number.isFinite(Number(pickupLatitude)) ||
      !Number.isFinite(Number(pickupLongitude)) ||
      !Number.isFinite(Number(destinationLatitude)) ||
      !Number.isFinite(Number(destinationLongitude))
    )
      return;

    let cancelled = false;
    // Cards render immediately with icon/name/eta so the sheet doesn't sit
    // empty, but price is left unset (NaN) until the backend's authoritative
    // /rides/estimate response lands below — the UI never shows a client-computed fare.
    const fallbackOptions = _rawVehicles.map((vehicle) =>
      mapDBVehicleToOption(
        vehicle,
        nearestDistanceByType[normaliseVehicleKey(vehicle.name ?? "car")],
      ),
    );

    setRideOptions(fallbackOptions);
    setSelectedRide((current) => current ?? fallbackOptions[0]?.id ?? null);
    setLoadingVehicles(false);

    const loadBackendEstimates = async () => {
      for (const vehicle of _rawVehicles) {
        if (cancelled) return;
        const fallback = fallbackOptions.find(
          (option) => option.id === vehicle.name,
        );
        if (!fallback) continue;

        try {
          const estimate = await apiClient.post<RideEstimateResponse>(
            "/rides/estimate",
            isReturn
              ? {
                  vehicle_type: vehicle.name,
                  trip_type: "return",
                  pickup_lat: Number(pickupLatitude),
                  pickup_lng: Number(pickupLongitude),
                  destination_lat: Number(destinationLatitude),
                  destination_lng: Number(destinationLongitude),
                }
              : {
                  vehicle_type: vehicle.name,
                  pickup_lat: Number(pickupLatitude),
                  pickup_lng: Number(pickupLongitude),
                  drop_lat: Number(destinationLatitude),
                  drop_lng: Number(destinationLongitude),
                },
            {
              suppressErrorLog: true,
              timeoutMs: 4500,
            },
          );

          if (cancelled) return;
          if (!estimate.success || !estimate.data) continue;

          const apiFare = Number(estimate.data.estimated_fare);
          const sane = apiFare > 0 && Number.isFinite(apiFare);
          if (!sane) continue;

          setRideOptions((current) =>
            current.map((option) =>
              option.id === vehicle.name
                ? { ...option, price: parseFloat(apiFare.toFixed(2)) }
                : option,
            ),
          );
        } catch {
          // Backend estimate failed/timed out — this vehicle's card keeps
          // showing "Calculating…" rather than falling back to a client guess.
        }
      }
    };

    loadBackendEstimates();

    return () => {
      cancelled = true;
    };
  }, [
    destinationLatitude,
    destinationLongitude,
    directions,
    returnDirections,
    pickupLatitude,
    pickupLongitude,
    tripType,
    _rawVehicles,
  ]);

  // Refresh just the ETA as nearby driver positions update, without touching
  // price (which the fare effect above owns) or resetting backend estimates.
  useEffect(() => {
    if (_rawVehicles.length === 0) return;
    setRideOptions((current) =>
      current.map((option) => {
        const key = normaliseVehicleKey(option.id);
        const nearestMeters = nearestDistanceByType[key];
        const eta =
          nearestMeters != null
            ? formatEtaFromDistanceMeters(nearestMeters)
            : (ETA_MAP[key] ?? "4 mins");
        return eta === option.eta ? option : { ...option, eta };
      }),
    );
  }, [nearestDistanceByType, _rawVehicles]);
  const handleBookNow = useCallback(() => {
    if (!pickup || !destination || !selectedRide || rideOptions.length === 0)
      return;
    const opt = rideOptions.find((r) => r.id === selectedRide);
    if (!opt || !Number.isFinite(opt.price)) return;
    setOutboundPickup(pickup);
    setOutboundDropoff(destination);
    setOutboundRide(opt);
    // One-way and return trips both confirm here now — a return trip's
    // destination and vehicle choice were already collected above, and the
    // return drop is always the pickup point, derived server-side.
    router.push("/ride-booking/confirm");
  }, [
    destination,
    pickup,
    rideOptions,
    router,
    selectedRide,
    setOutboundDropoff,
    setOutboundPickup,
    setOutboundRide,
  ]);

  const hasPendingFareSetup = Boolean(
    directions && _rawVehicles.length > 0 && rideOptions.length === 0,
  );
  const loading = loadingRoute || loadingVehicles || hasPendingFareSetup;
  const selectedRidePriceReady = Number.isFinite(
    rideOptions.find((r) => r.id === selectedRide)?.price,
  );
  const nearbyVehicles = React.useMemo(
    () =>
      selectedRide
        ? allNearbyVehicles.filter(
            (v) => normaliseVehicleKey(v.vehicleType) === normaliseVehicleKey(selectedRide),
          )
        : allNearbyVehicles,
    [allNearbyVehicles, selectedRide],
  );

  if (!pickup || !destination) {
    return (
      <View style={[styles.container, styles.loadingState]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingStateText}>Loading your trip route...</Text>
      </View>
    );
  }

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
          tripType === "return"
            ? directions && returnDirections
              ? [...directions.polyline, ...returnDirections.polyline]
              : [pickup, destination, pickup]
            : directions && directions.polyline.length > 0
              ? directions.polyline
              : [pickup, destination]
        }
        routeColor={GREEN}
        pickupColor={GREEN}
        nearbyVehicles={nearbyVehicles}
        fitEdgePadding={{ top: 120, right: 80, bottom: 430, left: 80 }}
        // A return trip's marked "destination" is a waypoint the driver
        // comes back from, not a drop - and the ride's actual drop is
        // always forced equal to pickup server-side, so the pickup pin
        // doubles as the drop too. See DriverStyleRideMap.tsx / matching.tsx
        // for the same distinction on the live-tracking map.
        pickupLabel={tripType === "return" ? "Pickup & Drop" : undefined}
        dropoffLabel={tripType === "return" ? "Return Point" : "Drop"}
        dropoffColor={tripType === "return" ? "#7C3AED" : "#F97316"}
      />

      {/* ── BACK BUTTON ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={20} color="#111827" />
      </TouchableOpacity>

      {/* ── ROUND TRIP BADGE ────────────────────────────────────────────── */}
      {tripType === "return" && (
        <View style={styles.roundTripPill}>
          <Ionicons name="repeat" size={13} color="#FFFFFF" />
          <Text style={styles.roundTripPillText}>Round trip</Text>
        </View>
      )}

      {/* ── ROUTE PILL ──────────────────────────────────────────────────── */}
      {!loadingRoute && directions && (
        <View style={styles.routePill}>
          <Ionicons name="navigate" size={14} color={GREEN} />
          <Text style={styles.routePillText}>
            {tripType === "return" && returnDirections
              ? `${formatDistance(directions.distance + returnDirections.distance)} · ${formatDuration(directions.duration + returnDirections.duration)} (round trip)`
              : `${directions.distanceText} · ${directions.durationText}`}
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
            paddingBottom: 20,
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
                onSelect={() => {
                  setSelectedRide(ride.id);
                  setOutboundRide(ride);
                }}
                index={i}
                directions={directions}
              />
            ))}
          </ScrollView>
        )}

        {/* ── OPTIONS ROW ────────────────────────────────────────────────── */}
        <View style={styles.optionsRow}>
<TouchableOpacity
  style={styles.optionChip}
  onPress={() => {
   if (paymentMethod === "card") {
  Alert.alert(
    "Card payments are pending",
    "Cash is the only available payment option right now.",
  );
  return;
}


    const currentRide = rideOptions.find(
      (ride) => ride.id === selectedRide,
    );
    if (currentRide) {
      setOutboundRide(currentRide);
    }
    router.push("/ride-booking/payment-method");
  }}
  activeOpacity={0.82}
  accessibilityRole="button"
  accessibilityLabel={`Change payment method. Currently ${usePickuCredit ? `PickU credit plus ${paymentMethod}` : paymentMethod}`}
>
            <Ionicons
              name={
                usePickuCredit
                  ? "wallet-outline"
                  : paymentMethod === "card"
                    ? "card-outline"
                    : "cash-outline"
              }
              size={16}
              color={GREEN}
            />
            <Text style={styles.optionChipText}>
              {usePickuCredit
                ? `Credit + ${paymentMethod === "card" ? "card" : "cash"}`
                : paymentMethod === "card" && selectedPaymentCard
                  ? `•••• ${selectedPaymentCard.last4}`
                  : paymentMethod === "card"
                    ? "Card"
                    : "Cash"}
            </Text>
            <Ionicons name="chevron-down" size={13} color={GREEN} />
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
            (!selectedRide || loading || !selectedRidePriceReady) &&
              styles.bookBtnDisabled,
          ]}
          onPress={handleBookNow}
          disabled={!selectedRide || loading || !selectedRidePriceReady}
          activeOpacity={0.82}
        >
          <Text style={styles.bookBtnText}>
            {!loading && selectedRide && !selectedRidePriceReady
              ? "Calculating fare…"
              : tripType === "return"
                ? "Continue to Confirm →"
                : "Book Now"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4FBFF" },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingStateText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "800",
  },

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

  roundTripPill: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : (StatusBar.currentHeight ?? 24) + 12,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GREEN,
    borderRadius: 20,
    paddingHorizontal: 12,
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

  roundTripPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
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
    overflow: "visible",
  },

  cardsRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingTop: 16,
    paddingBottom: 4,
  },

rideCard: {
  width: 118,
  height: 172,
  borderRadius: 16,
  borderWidth: 2,
  borderColor: "#E5E7EB",
  backgroundColor: "#FAFAFA",
  paddingVertical: 14,
  paddingHorizontal: 10,
  alignItems: "center",
  justifyContent: "flex-start", // top-align content instead of centering as a block
  gap: 4,
  position: "relative",
  overflow: "visible",
},

  etaBadge: {
    position: "absolute",
    top: -8,
    right: -6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: GREEN_LIGHT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 5,
  },

  etaBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: GREEN_DARK,
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
