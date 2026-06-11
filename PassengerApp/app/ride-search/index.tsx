import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Animated,
  ScrollView,
} from "react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import LocationPicker from "../components/ride/LocationPicker";
import ReturnLocationPicker from "../components/ride/ReturnLocationPicker";
import TripTypeToggle from "../components/ride/ridesearch_TripTypeToggle";
import BookForFriendToggle from "../components/ride/ridesearch_BookForFriendToggle";
import SavedAddresses from "../components/ride/ridesearch_SavedAddresses";
import { LocationSuggestion } from "../services/location/locationSuggestionsService";
import { useRideSearch } from "../context/RideSearchContext";

type TripType = "one-way" | "return-trip";

export default function RideSearchScreen() {
  const {
    setOutboundPickup,
    setOutboundDropoff,
    setTripType: setContextTripType,
  } = useRideSearch();

  const [currentLocation, setCurrentLocation] =
    useState<LocationSuggestion | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [tripType, setTripType] = useState<TripType>("one-way");
  const [bookForFriend, setBookForFriend] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
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
        console.error(error);
      } finally {
        if (!cancelled) setIsLoadingLocation(false);
      }
    };
    getCurrentLocation();
    return () => {
      cancelled = true;
    };
  }, []);

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
    outputRange: [
      0,
      (require("react-native").Dimensions.get("window").width - 32) / 2,
    ],
  });

  const handleSavedAddressSelect = (location: LocationSuggestion) => {
    console.log("Selected saved address:", location);
  };

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#0D4F3C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a ride</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
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

        <Animated.View style={[styles.pickerWrap, { opacity: contentOpacity }]}>
          {currentLocation &&
            (tripType === "one-way" ? (
              <LocationPicker
                onConfirm={handleLocationConfirm}
                currentLocation={currentLocation}
              />
            ) : (
              <ReturnLocationPicker
                onConfirm={handleReturnConfirm}
                currentLocation={currentLocation}
              />
            ))}
        </Animated.View>
      </ScrollView>
    </View>
  );

  function handleLocationConfirm(
    pickup: LocationSuggestion,
    destination: LocationSuggestion,
  ) {
    setOutboundPickup(pickup);
    setOutboundDropoff(destination);
    setContextTripType("oneway");
    router.push({
      pathname: "/ride-search/select-ride",
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
      pathname: "/ride-search/select-ride-return",
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
  container: { flex: 1, backgroundColor: "#F0FAF5" },
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
  },
  header: {
    marginTop: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0D4F3C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0D4F3C" },
  headerSpacer: { width: 40 },
  pickerWrap: { marginHorizontal: 16 },
});
