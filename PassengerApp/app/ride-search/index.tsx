import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";

import * as Location from "expo-location";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import LocationPicker from "../components/ride/LocationPicker";
import { LocationSuggestion } from "../services/location/locationSuggestionsService";
import { useRideSearch } from "../context/RideSearchContext";

export default function RideSearchScreen() {
  const { setOutboundPickup, setOutboundDropoff, setTripType: setContextTripType } = useRideSearch();
  const [currentLocation, setCurrentLocation] =
    useState<LocationSuggestion | null>(null);

  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const [tripType, setTripType] = useState<"one-way" | "return-trip">(
    "one-way",
  );

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("Location permission denied");
        setIsLoadingLocation(false);
        return;
      }

      const current = await Location.getCurrentPositionAsync({});

      setCurrentLocation({
        id: "current",
        address: "Your Location",
        details: "Current position",
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        placeType: "address",
      });
    } catch (error) {
      console.log("Location Error:", error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleLocationConfirm = (
    pickup: LocationSuggestion,
    destination: LocationSuggestion,
  ) => {
    // Save to centralized search context
    setOutboundPickup(pickup);
    setOutboundDropoff(destination);
    setContextTripType(tripType === "return-trip" ? "return" : "oneway");

    // Always navigate to outbound ride selection first
    router.push({
      pathname: "/ride-search/select-ride",
      params: {
        pickup: JSON.stringify(pickup),
        destination: JSON.stringify(destination),
      },
    });
  };

  if (isLoadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0B7BDC" />

        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Select Ride</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* Trip Type Selection */}
      <View style={styles.tripTypeSection}>
        {/* One Way */}
        <TouchableOpacity
          style={styles.tripTypeButton}
          onPress={() => setTripType("one-way")}
        >
          <Ionicons
            name={
              tripType === "one-way" ? "radio-button-on" : "radio-button-off"
            }
            size={16}
            color={tripType === "one-way" ? "#111827" : "#D1D5DB"}
          />

          <Text
            style={[
              styles.tripTypeText,
              tripType !== "one-way" && {
                color: "#9CA3AF",
              },
            ]}
          >
            One way
          </Text>
        </TouchableOpacity>

        {/* Return Trip */}
        <TouchableOpacity
          style={styles.tripTypeButton}
          onPress={() => setTripType("return-trip")}
        >
          <Ionicons
            name={
              tripType === "return-trip"
                ? "radio-button-on"
                : "radio-button-off"
            }
            size={16}
            color={tripType === "return-trip" ? "#111827" : "#D1D5DB"}
          />

          <Text
            style={[
              styles.tripTypeText,
              tripType !== "return-trip" && {
                color: "#9CA3AF",
              },
            ]}
          >
            Return trip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Picker */}
      {currentLocation && (
        <LocationPicker
          onConfirm={handleLocationConfirm}
          currentLocation={currentLocation}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FBFF",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4FBFF",
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },

  header: {
    marginTop: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },

  tripTypeSection: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  tripTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 20,
    elevation: 1,
  },

  tripTypeText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },
});
