import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Image,
  LayoutAnimation,
  PanResponder,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  fallbackRoute,
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
const RIDE_CARD_WIDTH = 112;
const CAROUSEL_EDGE_COPIES = 3;

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function getVehicleCapacity(vehicleId: string): number {
  const key = normaliseVehicleKey(vehicleId);
  if (["bike", "motorbike", "motorcycle"].includes(key)) return 1;
  if (["tuk", "tuktuk", "threewheel", "minicar", "mini"].includes(key))
    return 3;
  if (["suv", "van", "minivan"].includes(key)) return 6;
  return 4;
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
  scrollX: Animated.Value;
  itemInterval: number;
  frontOffset: number;
};

function RideCard({
  ride,
  selected,
  onSelect,
  index,
  directions,
  scrollX,
  itemInterval,
  frontOffset,
}: RideCardProps) {
  const scale = useRef(new Animated.Value(selected ? 1 : 0.98)).current;
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
        toValue: selected ? 1 : 0.98,
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
    outputRange: [0, 0],
  });

  const stars = (ride.price * STARS_PER_LKR).toFixed(1);
  const carouselInputRange = [
    (index - 2) * itemInterval,
    (index - 1) * itemInterval,
    index * itemInterval,
    (index + 1) * itemInterval,
    (index + 2) * itemInterval,
  ];
  const carouselRotateY = scrollX.interpolate({
    inputRange: carouselInputRange,
    outputRange: ["70deg", "44deg", "0deg", "-44deg", "-70deg"],
    extrapolate: "clamp",
  });
  const carouselTranslateY = scrollX.interpolate({
    inputRange: carouselInputRange,
    outputRange: [4, -12, 46, -12, 4],
    extrapolate: "clamp",
  });
  const carouselTranslateX = scrollX.interpolate({
    inputRange: carouselInputRange,
    outputRange: [14, 7, frontOffset, -7, -14],
    extrapolate: "clamp",
  });
  const carouselOpacity = scrollX.interpolate({
    inputRange: carouselInputRange,
    outputRange: [0.62, 0.82, 1, 0.82, 0.62],
    extrapolate: "clamp",
  });
  const carouselScale = scrollX.interpolate({
    inputRange: carouselInputRange,
    outputRange: [0.68, 0.82, 1.04, 0.82, 0.68],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={{
        opacity: carouselOpacity,
        zIndex: selected ? 10 : 1,
        transform: [
          { perspective: 700 },
          { translateX: carouselTranslateX },
          { translateY: carouselTranslateY },
          { rotateY: carouselRotateY },
          { scale: carouselScale },
        ],
      }}
      renderToHardwareTextureAndroid
      needsOffscreenAlphaCompositing
    >
      <Animated.View
        style={{
          opacity: entranceOpacity,
          zIndex: selected ? 4 : 1,
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
            ]}
          >
            {selected && (
              <View style={styles.selectedCheck}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}
            {/* Icon area */}
            <View style={styles.cardIconWrap}>
              <Image
                source={getVehicleRideImage(ride.id)}
                style={{ width: 85, height: 46, resizeMode: "contain" }}
              />
            </View>

            {/* Name */}
            <Text
              style={styles.cardName}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
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
    </Animated.View>
  );
}

type CircularRideCardProps = {
  ride: RideOption;
  selected: boolean;
  onSelect: () => void;
  directions: DirectionsResult | null;
  left: number;
  top: number;
  scale: number;
  rotateY: string;
  opacity: number;
  zIndex: number;
};

function CircularRideCard({
  ride,
  selected,
  onSelect,
  directions,
  left,
  top,
  scale,
  rotateY,
  opacity,
  zIndex,
}: CircularRideCardProps) {
  const stars = (ride.price * STARS_PER_LKR).toFixed(1);

  return (
    <View
      style={[
        styles.circularCardPosition,
        {
          left,
          top,
          opacity,
          zIndex,
          transform: [{ perspective: 800 }, { rotateY }, { scale }],
        },
      ]}
      renderToHardwareTextureAndroid
    >
      <Pressable onPress={onSelect} style={styles.circularCardPressable}>
        <View
          style={[styles.rideCard, selected && styles.circularCardSelected]}
        >
          {selected && (
            <View style={styles.selectedCheck}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.cardIconWrap}>
            <Image
              source={getVehicleRideImage(ride.id)}
              style={styles.circularVehicleImage}
            />
          </View>
          <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit>
            {ride.name}
          </Text>
          <View style={styles.cardMeta}>
            <Ionicons name="person-outline" size={11} color="#9CA3AF" />
            <Text style={styles.cardEta} numberOfLines={1}>
              {ride.eta}
            </Text>
          </View>
          <Text
            style={styles.cardPrice}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            LKR {ride.price.toFixed(2)}
          </Text>
          <View style={styles.starsRow}>
            <Ionicons name="star" size={11} color="#FBBF24" />
            <Text style={styles.starsText} numberOfLines={1}>
              Earn {stars}
            </Text>
          </View>
          {directions && (
            <Text style={styles.cardRoute} numberOfLines={1}>
              {directions.distanceText} · {directions.durationText}
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SelectRideScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const responsiveCardGap = Math.max(10, Math.min(18, screenWidth * 0.035));
  const carouselItemInterval = RIDE_CARD_WIDTH + responsiveCardGap;
  const carouselFrontOffset = Math.max(42, Math.min(64, screenWidth * 0.14));
  const {
    tripType,
    outboundTrip,
    paymentMethod,
    setOutboundRide,
    setOutboundPickup,
    setOutboundDropoff,
  } = useRideSearch();

  const [selectedRide, setSelectedRide] = useState<string | null>(null);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const carouselScrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<any>(null);
  const [centeredCarouselIndex, setCenteredCarouselIndex] = useState(0);
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
  const loopCopyCount =
    rideOptions.length > 1
      ? Math.min(CAROUSEL_EDGE_COPIES, rideOptions.length)
      : 0;
  const carouselItems = React.useMemo(
    () =>
      loopCopyCount > 0
        ? [
            ...rideOptions.slice(-loopCopyCount),
            ...rideOptions,
            ...rideOptions.slice(0, loopCopyCount),
          ]
        : rideOptions,
    [loopCopyCount, rideOptions],
  );

  useEffect(() => {
    if (rideOptions.length === 0) return;
    const initialIndex = loopCopyCount;
    const initialOffset = initialIndex * carouselItemInterval;
    setCenteredCarouselIndex(initialIndex);
    carouselScrollX.setValue(initialOffset);
    const frame = requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ x: initialOffset, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [
    carouselItemInterval,
    carouselScrollX,
    loopCopyCount,
    rideOptions.length,
  ]);
  const selectedCircularIndex = Math.max(
    0,
    rideOptions.findIndex((ride) => ride.id === selectedRide),
  );
  const selectedCircularRide = rideOptions[selectedCircularIndex] || null;
  const selectCircularRide = useCallback(
    (nextIndex: number) => {
      if (rideOptions.length === 0) return;
      const normalizedIndex =
        ((nextIndex % rideOptions.length) + rideOptions.length) %
        rideOptions.length;
      LayoutAnimation.configureNext({
        duration: 180,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
      });
      setSelectedRide(rideOptions[normalizedIndex].id);
    },
    [rideOptions],
  );
  const circularPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 10 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -32 || gesture.vx < -0.35) {
            selectCircularRide(selectedCircularIndex + 1);
          } else if (gesture.dx > 32 || gesture.vx > 0.35) {
            selectCircularRide(selectedCircularIndex - 1);
          }
        },
      }),
    [selectCircularRide, selectedCircularIndex],
  );
  const pickupLatitude = pickup?.latitude;
  const pickupLongitude = pickup?.longitude;
  const destinationLatitude = destination?.latitude;
  const destinationLongitude = destination?.longitude;

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
    (async () => {
      setLoadingRoute(true);
      const fallback = fallbackRoute(
        Number(pickupLatitude),
        Number(pickupLongitude),
        Number(destinationLatitude),
        Number(destinationLongitude),
      );
      setDirections(fallback);
      setLoadingRoute(false);
      try {
        const result = await getCachedDirections_withCache(
          Number(pickupLatitude),
          Number(pickupLongitude),
          Number(destinationLatitude),
          Number(destinationLongitude),
        );
        if (!cancelled && result) setDirections(result);
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
    if (
      !directions ||
      _rawVehicles.length === 0 ||
      !Number.isFinite(Number(pickupLatitude)) ||
      !Number.isFinite(Number(pickupLongitude)) ||
      !Number.isFinite(Number(destinationLatitude)) ||
      !Number.isFinite(Number(destinationLongitude))
    )
      return;

    let cancelled = false;
    const fallbackOptions = _rawVehicles.map((vehicle) =>
      mapDBVehicleToOption(vehicle, directions.distance, directions.duration),
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
            {
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
          const sane = apiFare > 0 && apiFare < fallback.price * 10;
          if (!sane) continue;

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
    pickupLatitude,
    pickupLongitude,
    _rawVehicles,
  ]);
  const handleBookNow = useCallback(() => {
    if (!pickup || !destination || !selectedRide || rideOptions.length === 0)
      return;
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
  }, [
    destination,
    pickup,
    rideOptions,
    router,
    selectedRide,
    setOutboundDropoff,
    setOutboundPickup,
    setOutboundRide,
    tripType,
  ]);

  const hasPendingFareSetup = Boolean(
    directions && _rawVehicles.length > 0 && rideOptions.length === 0,
  );
  const loading = loadingRoute || loadingVehicles || hasPendingFareSetup;
  const nearbyVehicles = useNearbyVehicles(pickup, selectedRide);

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
          <View style={styles.carouselStage}>
            <View pointerEvents="none" style={styles.carouselCenterMarker}>
              <View style={styles.carouselMarkerPin}>
                <Ionicons name="location" size={24} color="#FFFFFF" />
              </View>
            </View>
            <View
              style={styles.circularCardsLayer}
              {...circularPanResponder.panHandlers}
            >
              {rideOptions.map((ride, index) => {
                const count = rideOptions.length;
                const relativeIndex =
                  (((index - selectedCircularIndex) % count) + count) % count;
                const angleDegrees = 90 + (relativeIndex * 360) / count;
                const angle = (angleDegrees * Math.PI) / 180;
                const stageWidth = screenWidth - 32;
                const radiusX = Math.max(96, stageWidth / 2 - 43);
                const radiusY = Math.max(38, Math.min(52, screenWidth * 0.13));
                const depth = (Math.sin(angle) + 1) / 2;
                const isSelected = index === selectedCircularIndex;

                if (isSelected) return null;

                return (
                  <Pressable
                    key={`vehicle-orbit-${ride.id}`}
                    onPress={() => selectCircularRide(index)}
                    style={[
                      styles.orbitVehicle,
                      {
                        left: stageWidth / 2 + Math.cos(angle) * radiusX - 39,
                        top: 67 + Math.sin(angle) * radiusY - 28,
                        opacity: 0.72 + depth * 0.28,
                        zIndex: Math.round(5 + depth * 10),
                        transform: [{ scale: 0.78 + depth * 0.16 }],
                      },
                    ]}
                  >
                    <Image
                      source={getVehicleRideImage(ride.id)}
                      style={styles.orbitVehicleImage}
                    />
                  </Pressable>
                );
              })}
            </View>
            {selectedCircularRide && (
              <View style={styles.selectedVehiclePanel}>
                <View style={styles.selectedVehicleTopRow}>
                  <Image
                    source={getVehicleRideImage(selectedCircularRide.id)}
                    style={styles.selectedVehicleImage}
                  />
                  <View style={styles.selectedVehicleHeading}>
                    <Text style={styles.selectedVehicleName} numberOfLines={1}>
                      {selectedCircularRide.name}
                    </Text>
                    <View style={styles.selectedVehicleMeta}>
                      <Ionicons
                        name="person-outline"
                        size={13}
                        color="#94A3B8"
                      />
                      <Text style={styles.selectedVehicleMetaText}>
                        {getVehicleCapacity(selectedCircularRide.id)} seats
                      </Text>
                      <Ionicons name="time-outline" size={13} color="#94A3B8" />
                      <Text style={styles.selectedVehicleMetaText}>
                        {selectedCircularRide.eta}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.selectedPanelCheck}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.selectedVehicleDivider} />
                <View style={styles.selectedVehicleBottomRow}>
                  <View>
                    <Text style={styles.selectedVehiclePrice}>
                      LKR {selectedCircularRide.price.toFixed(2)}
                    </Text>
                    {directions && (
                      <Text style={styles.selectedVehicleRoute}>
                        {directions.distanceText} · {directions.durationText}
                      </Text>
                    )}
                  </View>
                  <View style={styles.bestMatchBadge}>
                    <Ionicons name="star" size={12} color={GREEN} />
                    <Text style={styles.bestMatchText}>Best match</Text>
                  </View>
                </View>
              </View>
            )}
            <Animated.ScrollView
              ref={carouselRef}
              horizontal
              removeClippedSubviews={false}
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={carouselItemInterval}
              snapToAlignment="start"
              disableIntervalMomentum
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: carouselScrollX } } }],
                {
                  useNativeDriver: true,
                  listener: (event: any) => {
                    const centeredIndex = Math.max(
                      0,
                      Math.min(
                        carouselItems.length - 1,
                        Math.round(
                          event.nativeEvent.contentOffset.x /
                            carouselItemInterval,
                        ),
                      ),
                    );
                    const centeredRide = carouselItems[centeredIndex];
                    setCenteredCarouselIndex(centeredIndex);
                    if (centeredRide && centeredRide.id !== selectedRide) {
                      setSelectedRide(centeredRide.id);
                    }
                  },
                },
              )}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(event) => {
                let centeredIndex = Math.max(
                  0,
                  Math.min(
                    carouselItems.length - 1,
                    Math.round(
                      event.nativeEvent.contentOffset.x / carouselItemInterval,
                    ),
                  ),
                );
                const centeredRide = carouselItems[centeredIndex];
                if (centeredRide) setSelectedRide(centeredRide.id);

                if (loopCopyCount > 0) {
                  if (centeredIndex < loopCopyCount) {
                    centeredIndex += rideOptions.length;
                  } else if (
                    centeredIndex >=
                    loopCopyCount + rideOptions.length
                  ) {
                    centeredIndex -= rideOptions.length;
                  }

                  const normalizedOffset = centeredIndex * carouselItemInterval;
                  carouselRef.current?.scrollTo({
                    x: normalizedOffset,
                    animated: false,
                  });
                  carouselScrollX.setValue(normalizedOffset);
                }
                setCenteredCarouselIndex(centeredIndex);
              }}
              contentContainerStyle={[
                styles.cardsRow,
                {
                  gap: responsiveCardGap,
                  paddingHorizontal: Math.max(
                    16,
                    (screenWidth - RIDE_CARD_WIDTH) / 2,
                  ),
                },
              ]}
              style={[styles.cardsScroll, styles.hiddenCarousel]}
            >
              {carouselItems.map((ride, i) => (
                <RideCard
                  key={`${ride.id}-${i}`}
                  ride={ride}
                  selected={
                    selectedRide === ride.id && centeredCarouselIndex === i
                  }
                  onSelect={() => {
                    setSelectedRide(ride.id);
                    carouselRef.current?.scrollTo({
                      x: i * carouselItemInterval,
                      animated: true,
                    });
                  }}
                  index={i}
                  directions={directions}
                  scrollX={carouselScrollX}
                  itemInterval={carouselItemInterval}
                  frontOffset={carouselFrontOffset}
                />
              ))}
            </Animated.ScrollView>
            <View pointerEvents="none" style={styles.carouselDots}>
              {rideOptions.map((ride) => (
                <View
                  key={`dot-${ride.id}`}
                  style={[
                    styles.carouselDot,
                    selectedRide === ride.id && styles.carouselDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── OPTIONS ROW ────────────────────────────────────────────────── */}
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={styles.optionChip}
            onPress={() => router.push("/ride-booking/payment-method")}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={`Change payment method. Currently ${paymentMethod}`}
          >
            <Ionicons
              name={
                paymentMethod === "card"
                  ? "card-outline"
                  : paymentMethod === "wallet"
                    ? "wallet-outline"
                    : "cash-outline"
              }
              size={16}
              color={GREEN}
            />
            <Text style={styles.optionChipText}>
              {paymentMethod === "card"
                ? "Card"
                : paymentMethod === "wallet"
                  ? "Wallet"
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
            (!selectedRide || loading) && styles.bookBtnDisabled,
          ]}
          onPress={handleBookNow}
          disabled={!selectedRide || loading}
          activeOpacity={0.82}
        >
          <Text style={styles.bookBtnText}>
            {tripType === "return"
              ? "Continue to Return →"
              : selectedCircularRide
                ? `Book ${selectedCircularRide.name} · LKR ${selectedCircularRide.price.toFixed(2)}`
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
    marginBottom: 6,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
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
    height: 274,
    overflow: "visible",
    zIndex: 1,
  },

  hiddenCarousel: {
    display: "none",
  },

  carouselStage: {
    position: "relative",
    height: 286,
  },

  circularCardsLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 274,
    zIndex: 1,
    overflow: "visible",
  },

  orbitVehicle: {
    position: "absolute",
    width: 78,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },

  orbitVehicleImage: {
    width: 76,
    height: 48,
    resizeMode: "contain",
  },

  selectedVehiclePanel: {
    position: "absolute",
    top: 140,
    left: 12,
    right: 12,
    minHeight: 116,
    zIndex: 40,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: GREEN,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
  },

  selectedVehicleTopRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
  },

  selectedVehicleImage: {
    width: 88,
    height: 48,
    resizeMode: "contain",
    marginRight: 10,
  },

  selectedVehicleHeading: {
    flex: 1,
    minWidth: 0,
  },

  selectedVehicleName: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
  },

  selectedVehicleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },

  selectedVehicleMetaText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    marginRight: 5,
  },

  selectedPanelCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    backgroundColor: GREEN,
  },

  selectedVehicleDivider: {
    height: 1,
    marginVertical: 8,
    backgroundColor: "#E5E7EB",
  },

  selectedVehicleBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectedVehiclePrice: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900",
  },

  selectedVehicleRoute: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 2,
  },

  bestMatchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#E8F8F0",
  },

  bestMatchText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "800",
  },

  circularCardPosition: {
    position: "absolute",
    width: RIDE_CARD_WIDTH,
    height: 180,
    backfaceVisibility: "hidden",
  },

  circularCardPressable: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },

  circularCardSelected: {
    borderColor: GREEN,
    backgroundColor: "#F3F4F6",
  },

  circularVehicleImage: {
    width: 85,
    height: 46,
    resizeMode: "contain",
  },

  carouselCenterMarker: {
    position: "absolute",
    top: 25,
    left: "50%",
    width: 62,
    height: 62,
    marginLeft: -31,
    zIndex: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  carouselMarkerPin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    transform: [{ translateY: -8 }],
  },

  carouselDots: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },

  carouselDotActive: {
    width: 16,
    backgroundColor: GREEN,
  },

  cardsRow: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 4,
  },

  rideCard: {
    width: RIDE_CARD_WIDTH,
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
    backfaceVisibility: "hidden",
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

  selectedCheck: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 20,
    height: 20,
    borderRadius: 10,
    zIndex: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
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
    marginTop: 2,
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
