import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";

import * as Location from "expo-location";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import LocationPicker from "../components/ride/LocationPicker";
import { LocationSuggestion } from "../services/location/locationSuggestionsService";
import { useRideSearch } from "../context/RideSearchContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIP_TYPES = {
  ONE_WAY: "one-way",
  RETURN_TRIP: "return-trip",
} as const;

type TripType = (typeof TRIP_TYPES)[keyof typeof TRIP_TYPES];

const TOGGLE_WIDTH = Dimensions.get("window").width - 32; // full-width minus horizontal padding
const PILL_WIDTH = TOGGLE_WIDTH / 2;

// ─── Component ────────────────────────────────────────────────────────────────

export default function RideSearchScreen() {
  const {
    setOutboundPickup,
    setOutboundDropoff,
    setTripType: setContextTripType,
  } = useRideSearch();

  const [currentLocation, setCurrentLocation] =
    useState<LocationSuggestion | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [tripType, setTripType] = useState<TripType>(TRIP_TYPES.ONE_WAY);

  // Animated pill slider
  const slideAnim = useRef(new Animated.Value(0)).current;
  // Subtle fade for content swap
  const contentOpacity = useRef(new Animated.Value(1)).current;

  // ── Location ──────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, // lighter on battery than High
        });

        if (!cancelled) {
          setCurrentLocation({
            id: "current",
            address: "Your Location",
            details: "Current position",
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
            placeType: "address",
          });
        }
      } catch (error) {
        // silently fall through — LocationPicker handles missing origin
      } finally {
        if (!cancelled) setIsLoadingLocation(false);
      }
    };

    getCurrentLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Trip type toggle ──────────────────────────────────────────────────────

  const handleTripTypeChange = (value: TripType) => {
    if (value === tripType) return;

    // Slide pill
    Animated.spring(slideAnim, {
      toValue: value === TRIP_TYPES.ONE_WAY ? 0 : 1,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();

    // Fade content out → update → fade back in
    Animated.sequence([
      Animated.timing(contentOpacity, {
        toValue: 0.4,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    setTripType(value);
  };

  const pillTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PILL_WIDTH],
  });

  // ── Confirm ───────────────────────────────────────────────────────────────

  const handleLocationConfirm = (
    pickup: LocationSuggestion,
    destination: LocationSuggestion,
  ) => {
    setOutboundPickup(pickup);
    setOutboundDropoff(destination);
    setContextTripType(
      tripType === TRIP_TYPES.RETURN_TRIP ? "return" : "oneway",
    );

    router.push({
      pathname: "/ride-search/select-ride",
      params: {
        pickup: JSON.stringify(pickup),
        destination: JSON.stringify(destination),
      },
    });
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIconWrap}>
          <Ionicons name="locate" size={28} color="#1B9E6E" />
        </View>
        <ActivityIndicator
          size="large"
          color="#1B9E6E"
          style={{ marginTop: 20 }}
        />
        <Text style={styles.loadingText}>Getting your location…</Text>
      </View>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#0D4F3C" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Plan Your Ride</Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* Segmented toggle */}
      <View style={styles.toggleTrack}>
        {/* Sliding pill (background) */}
        <Animated.View
          style={[
            styles.togglePill,
            { transform: [{ translateX: pillTranslateX }] },
          ]}
        />

        {/* One Way */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.toggleOption}
          onPress={() => handleTripTypeChange(TRIP_TYPES.ONE_WAY)}
        >
          <Ionicons
            name="arrow-forward"
            size={15}
            color={tripType === TRIP_TYPES.ONE_WAY ? "#ffffff" : "#6B9E8E"}
            style={styles.toggleIcon}
          />
          <Text
            style={[
              styles.toggleLabel,
              tripType === TRIP_TYPES.ONE_WAY && styles.toggleLabelActive,
            ]}
          >
            One Way
          </Text>
        </TouchableOpacity>

        {/* Return Trip */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.toggleOption}
          onPress={() => handleTripTypeChange(TRIP_TYPES.RETURN_TRIP)}
        >
          <Ionicons
            name="swap-horizontal"
            size={15}
            color={tripType === TRIP_TYPES.RETURN_TRIP ? "#ffffff" : "#6B9E8E"}
            style={styles.toggleIcon}
          />
          <Text
            style={[
              styles.toggleLabel,
              tripType === TRIP_TYPES.RETURN_TRIP && styles.toggleLabelActive,
            ]}
          >
            Return Trip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Picker — fades on trip-type change */}
      <Animated.View style={[styles.pickerWrap, { opacity: contentOpacity }]}>
        {currentLocation && (
          <LocationPicker
            onConfirm={handleLocationConfirm}
            currentLocation={currentLocation}
          />
        )}
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0FAF5",
  },

  // ── Loading ──────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0FAF5",
  },
  loadingIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#D6F2E7",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: "#4A7A68",
    fontWeight: "500",
    letterSpacing: 0.2,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    marginTop: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0D4F3C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0D4F3C",
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 36,
  },

  // ── Segmented Toggle ──────────────────────────────────────────────────────
  toggleTrack: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#D6F2E7",
    borderRadius: 14,
    padding: 4,
    height: 48,
    position: "relative",
    overflow: "hidden",
  },
  togglePill: {
    position: "absolute",
    top: 4,
    left: 4,
    width: PILL_WIDTH - 8,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1B9E6E",
    shadowColor: "#1B9E6E",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    gap: 6,
  },
  toggleIcon: {
    // slight nudge for visual balance
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A7A68",
    letterSpacing: 0.2,
  },
  toggleLabelActive: {
    color: "#FFFFFF",
  },

  // ── Picker area ───────────────────────────────────────────────────────────
  pickerWrap: {
    flex: 1,
  },
});
