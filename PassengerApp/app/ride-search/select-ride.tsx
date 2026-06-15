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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import {
  MOCK_VEHICLE_TYPES,
  mapDBVehicleToOption,
  type DBVehicleType,
} from "../../src/services/ride/vehicleTypes";

import {
  getCachedDirections_withCache,
  type DirectionsResult,
} from "../../src/services/routing/mapboxRoutingService";
import {
  useRideSearch,
  type RideOption,
  type LocationSuggestion,
} from "../../src/context/RideSearchContext";
import { apiClient } from "../../src/services/api/apiClient";

// ─── Constants ────────────────────────────────────────────────────────────────
const GREEN = "#20B768";
const GREEN_LIGHT = "#E8F8F0";
const GREEN_DARK = "#178A50";

// Approx stars earned per LKR spent
const STARS_PER_LKR = 0.01;

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
  const entranceY = useRef(new Animated.Value(30)).current;
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 360,
        delay: index * 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(entranceY, {
        toValue: 0,
        duration: 360,
        delay: index * 80,
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
            selected && styles.rideCardSelected,
          ]}
        >
          {/* Icon area */}
          <View
            style={[
              styles.cardIconWrap,
              selected && styles.cardIconWrapSelected,
            ]}
          >
            <Ionicons
              name={ride.icon as any}
              size={26}
              color={selected ? "#fff" : GREEN}
            />
          </View>

          {/* Name + seats row */}
          <Text style={[styles.cardName, selected && styles.cardTextWhite]}>
            {ride.name}
          </Text>

          <View style={styles.cardMeta}>
            <Ionicons
              name="person-outline"
              size={11}
              color={selected ? "rgba(255,255,255,0.75)" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.cardEta,
                selected && { color: "rgba(255,255,255,0.8)" },
              ]}
            >
              {ride.eta}
            </Text>
          </View>

          {/* Price */}
          <Text style={[styles.cardPrice, selected && styles.cardTextWhite]}>
            LKR {ride.price.toFixed(2)}
          </Text>

          {/* Stars earned */}
          <View style={styles.starsRow}>
            <Ionicons name="star" size={11} color="#FBBF24" />
            <Text
              style={[
                styles.starsText,
                selected && { color: "rgba(255,255,255,0.85)" },
              ]}
            >
              Earn {stars}
            </Text>
          </View>

          {/* Route info */}
          {directions && (
            <Text
              style={[
                styles.cardRoute,
                selected && { color: "rgba(255,255,255,0.7)" },
              ]}
            >
              {directions.distanceText} · {directions.durationText}
            </Text>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
// ─── Components ────────────────────────────────────────────────────────────────
const RouteMarker = ({
  label,
  address,
  color,
  secondaryLabel,
  secondaryColor,
}: {
  label: string;
  address?: string;
  color: string;
  secondaryLabel?: string;
  secondaryColor?: string;
}) => (
  <View style={styles.markerOuter}>
    <View style={styles.markerStackContainer}>
      {secondaryLabel && (
        <View style={styles.markerContainer}>
          <View
            style={[
              styles.labelPill,
              { backgroundColor: secondaryColor || color },
            ]}
          >
            <Text style={styles.labelPillText}>{secondaryLabel}</Text>
          </View>
          {address && (
            <Text style={styles.markerAddress} numberOfLines={1}>
              {address}
            </Text>
          )}
        </View>
      )}
      {secondaryLabel && <View style={styles.stackSpacer} />}
      <View style={styles.markerContainer}>
        <View style={[styles.labelPill, { backgroundColor: color }]}>
          <Text style={styles.labelPillText}>{label}</Text>
        </View>
        {address && (
          <Text style={styles.markerAddress} numberOfLines={1}>
            {address}
          </Text>
        )}
      </View>
    </View>
    <View style={styles.markerStem}>
      <View style={[styles.markerStemLine, { backgroundColor: color }]} />
      <View style={[styles.markerStemDot, { backgroundColor: color }]} />
    </View>
  </View>
);

export default function SelectRideScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { tripType, setOutboundRide, setOutboundPickup, setOutboundDropoff } =
    useRideSearch();

  const [selectedRide, setSelectedRide] = useState<string | null>(null);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [returnDirections, setReturnDirections] = useState<DirectionsResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const mapRef = useRef<MapView>(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [rawVehicles, setRawVehicles] = useState<DBVehicleType[]>([]);

  const pickup = JSON.parse(params.pickup as string);
  const destination = JSON.parse(params.destination as string);
  const stops: LocationSuggestion[] = params.stops
    ? JSON.parse(params.stops as string)
    : [];

  // Bottom sheet slide-up entrance
  const sheetY = useRef(new Animated.Value(200)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const animateSheetIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Fetch directions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRoute(true);
      try {
        // Outbound Points
        const outboundPoints = [
          { latitude: pickup.latitude, longitude: pickup.longitude },
          ...stops.map((s) => ({
            latitude: s.latitude,
            longitude: s.longitude,
          })),
          { latitude: destination.latitude, longitude: destination.longitude },
        ];
        const outboundResult = await getCachedDirections_withCache(outboundPoints);

        let returnResult = null;
        if (tripType === "return") {
          const returnPoints = [
            { latitude: destination.latitude, longitude: destination.longitude },
            { latitude: pickup.latitude, longitude: pickup.longitude },
          ];
          returnResult = await getCachedDirections_withCache(returnPoints);
        }

        if (!cancelled) {
          setDirections(outboundResult);
          setReturnDirections(returnResult);
        }
      } catch (e) {
        console.error("Directions error:", e);
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripType]);

  // Fetch vehicles
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingVehicles(true);
      try {
        const res = await apiClient.get<DBVehicleType[]>("/vehicle-types");
        const data =
          res.success && res.data && res.data.length > 0
            ? res.data.filter((v) => v.is_active)
            : MOCK_VEHICLE_TYPES;
        if (!cancelled) {
          setRawVehicles(data);
          setLoadingVehicles(false);
        }
      } catch {
        if (!cancelled) {
          setRawVehicles(MOCK_VEHICLE_TYPES);
          setLoadingVehicles(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute pricing once both are ready
  useEffect(() => {
    if (!directions || rawVehicles.length === 0) return;
    const mapped = rawVehicles.map((v) =>
      mapDBVehicleToOption(v, directions.distance, directions.duration),
    );
    setRideOptions(mapped);
    if (mapped.length > 0) setSelectedRide(mapped[0].id);
    animateSheetIn();
    setLoadingVehicles(false);
  }, [directions, rawVehicles]);

  useEffect(() => {
    if (!directions || !mapRef.current) return;

    const allPoints = [
      ...directions.polyline,
      ...(returnDirections ? returnDirections.polyline : []),
    ];

    mapRef.current.fitToCoordinates(allPoints, {
      edgePadding: {
        top: 100,
        right: 50,
        bottom: 350,
        left: 50,
      },
      animated: true,
    });
  }, [directions, returnDirections]);

  const handleBookNow = useCallback(() => {
    if (!selectedRide || rideOptions.length === 0) return;
    const opt = rideOptions.find((r) => r.id === selectedRide);
    if (!opt) return;
    setOutboundPickup(pickup);
    setOutboundDropoff(destination);
    setOutboundRide(opt);
    router.push(
      tripType === "return"
        ? "/ride-search/return-trip-location"
        : "/ride-search/confirmation",
    );
  }, [
    selectedRide,
    rideOptions,
    pickup,
    destination,
    tripType,
    router,
    setOutboundPickup,
    setOutboundDropoff,
    setOutboundRide,
  ]);

  const loading = loadingRoute || loadingVehicles;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── MAP ──────────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: (pickup.latitude + destination.latitude) / 2,
          longitude: (pickup.longitude + destination.longitude) / 2,
          latitudeDelta:
            Math.abs(pickup.latitude - destination.latitude) * 2.4 + 0.02,
          longitudeDelta:
            Math.abs(pickup.longitude - destination.longitude) * 2.4 + 0.02,
        }}
      >
        {directions && directions.polyline.length > 0 && (
          <>
            {/* White outline */}
            <Polyline
              coordinates={directions.polyline}
              strokeColor="#FFFFFF"
              strokeWidth={10}
              lineCap="round"
              lineJoin="round"
              zIndex={1}
            />

            {/* Green route */}
            <Polyline
              coordinates={directions.polyline}
              strokeColor="#20B768"
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
              zIndex={2}
            />
          </>
        )}

        {returnDirections && returnDirections.polyline.length > 0 && (
          <Polyline
            coordinates={returnDirections.polyline}
            strokeColor="#6B7280"
            strokeWidth={4}
            lineDashPattern={[10, 10]}
            lineCap="round"
            lineJoin="round"
            zIndex={2}
          />
        )}

        {/* Markers */}
        <Marker
          coordinate={{
            latitude: pickup.latitude,
            longitude: pickup.longitude,
          }}
          zIndex={100}
          tracksViewChanges={true}
        >
          <RouteMarker
            label="Pickup"
            secondaryLabel={tripType === "return" ? "Drop" : undefined}
            secondaryColor={tripType === "return" ? "#F97316" : undefined}
            address={pickup.address}
            color="#007AFF"
          />
        </Marker>

        {stops.map((stop, index) => {
          const label = `${index + 1}`;
          const color = "#F97316";

          return (
            <Marker
              key={stop.id || `stop-${index}`}
              coordinate={{
                latitude: stop.latitude,
                longitude: stop.longitude,
              }}
              zIndex={50}
              tracksViewChanges={true}
            >
              <RouteMarker label={label} address={stop.address} color={color} />
            </Marker>
          );
        })}

        {tripType !== "return" && (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            zIndex={10}
            tracksViewChanges={true}
          >
            <RouteMarker
              label="Drop"
              address={destination.address}
              color="#F97316"
            />
          </Marker>
        )}
      </MapView>

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
            paddingBottom: insets.bottom + 24,
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
    paddingBottom: 16,
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
    width: 106,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 3,
  },

  rideCardSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  cardIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  cardIconWrapSelected: {
    backgroundColor: GREEN_DARK,
  },

  cardName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },

  cardTextWhite: {
    color: "#fff",
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
    marginBottom: Platform.OS === "android" ? 12 : 0,
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
  // Custom Markers
  markerOuter: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 2,
    // Avoid excessive padding that clips on Android
  },
  markerStackContainer: {
    alignItems: "center",
    backgroundColor: "transparent",
  },
  stackSpacer: {
    height: 2,
  },
  markerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    // No minWidth here to allow tight fitting
  },
  labelPill: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 6,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 50, // Minimum for label text
  },
  labelPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  markerAddress: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "700",
    maxWidth: 150,
    marginRight: 2,
  },
  markerStem: {
    alignItems: "center",
    marginTop: -1,
  },
  markerStemLine: {
    width: 2,
    height: 8,
  },
  markerStemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: -3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
});
