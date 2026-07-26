import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import LocationPicker from "../../features/ride-booking/booking/PickupDropoffPicker";
import ReturnLocationPicker from "../../features/ride-booking/booking/ReturnTripLocationPicker";
import BookForFriendToggle from "../../features/ride-booking/booking/BookForFriendToggle";
import TripTypeToggle from "../../features/ride-booking/booking/TripTypeToggle";
import { useRideSearch } from "../../state/booking/RideBookingContext";
import { LocationSuggestion } from "../../services/maps/locationSuggestions";
import { getFreshCurrentLocationSuggestion } from "../../services/maps/currentLocation";
import { logExpectedError } from "../../services/errors/userMessages";

type TripType = "one-way" | "return-trip";

export default function RideSearchScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const {
    setOutboundPickup,
    setOutboundDropoff,
    setTripType: setContextTripType,
  } = useRideSearch();

  const params = useLocalSearchParams<{
    pickupAddress?: string;
    pickupLat?: string;
    pickupLng?: string;
    tripType?: string;
  }>();

  const [currentLocation, setCurrentLocation] =
    useState<LocationSuggestion | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [tripType, setTripType] = useState<TripType>(
    (params.tripType === "return-trip" || params.tripType === "return") ? "return-trip" : "one-way"
  );
  const [bookForFriend, setBookForFriend] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const fetchLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    try {
      const current = await getFreshCurrentLocationSuggestion();
      setCurrentLocation(current);
    } catch (error) {
      logExpectedError("Current location lookup failed", error);
      setLocationError(
        "Could not detect your exact phone location. Please turn on GPS/location services and try again."
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  useEffect(() => {
    if (params.pickupLat && params.pickupLng) {
      setCurrentLocation({
        id: "find_ride_custom",
        address: params.pickupAddress || "Selected Location",
        details: "Map pickup location",
        latitude: parseFloat(params.pickupLat),
        longitude: parseFloat(params.pickupLng),
        placeType: "address",
      });
      setIsLoadingLocation(false);
    } else {
      fetchLocation();
    }
  }, [params.pickupLat, params.pickupLng, params.pickupAddress]);

  const handleTripTypeChange = (value: TripType) => {
    if (value === tripType) return;
    Animated.spring(slideAnim, {
      toValue: value === "one-way" ? 0 : 1,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
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
    outputRange: [0, (windowWidth - 32) / 2],
  });

  const handleSavedAddressSelect = (location: LocationSuggestion) => {
    console.log("Selected saved address:", location);
  };

  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingIconWrap}>
          <Ionicons name="locate" size={28} color="#20B768" />
        </View>
        <ActivityIndicator
          size="large"
          color="#20B768"
          style={{ marginTop: 20 }}
        />
        <Text style={styles.loadingText}>Getting your location…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="close" size={26} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find Your Ride</Text>
          <View style={styles.headerSpacer} />
        </View>

        <BookForFriendToggle
          value={bookForFriend}
          onToggle={setBookForFriend}
        />

        <TripTypeToggle
          tripType={tripType}
          onToggle={handleTripTypeChange}
          slideAnim={slideAnim}
          pillTranslateX={pillTranslateX}
        />

        {locationError && (
          <View style={styles.locationErrorBanner}>
            <Ionicons name="warning-outline" size={18} color="#B45309" />
            <Text style={styles.locationErrorText}>{locationError}</Text>
            <TouchableOpacity onPress={fetchLocation} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <Animated.View style={[styles.pickerWrap, { opacity: contentOpacity }]}>
          {tripType === "one-way" ? (
            <LocationPicker
              onConfirm={handleLocationConfirm}
              currentLocation={currentLocation ?? undefined}
            />
          ) : (
            <ReturnLocationPicker
              onConfirm={handleReturnConfirm}
              currentLocation={currentLocation ?? undefined}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  function handleLocationConfirm(
    pickup: LocationSuggestion,
    destination: LocationSuggestion,
  ) {
    setOutboundPickup(pickup);
    setOutboundDropoff(destination);
    setContextTripType("oneway");
    router.push({
      pathname: "/ride-booking/select-vehicle",
      params: {
        pickup: JSON.stringify(pickup),
        destination: JSON.stringify(destination),
        bookForFriend: String(bookForFriend),
      },
    });
  }

  function handleReturnConfirm(
    pickup: LocationSuggestion,
    stop: LocationSuggestion | null,
    dropoff: LocationSuggestion,
  ) {
    setOutboundPickup(pickup);
    setOutboundDropoff(dropoff);
    setContextTripType("return");
    router.push({
      pathname: "/ride-booking/select-return-vehicle",
      params: {
        outboundPickup: JSON.stringify(pickup),
        outboundDest: JSON.stringify(dropoff),
        returnStop: JSON.stringify(stop),
        bookForFriend: String(bookForFriend),
      },
    });
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  keyboardView: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
  },
  header: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#000000" },
  headerSpacer: { width: 40 },
  pickerWrap: { flex: 1, minHeight: 0, marginHorizontal: 16 },
  locationErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    gap: 8,
  },
  locationErrorText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: "#B45309",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
