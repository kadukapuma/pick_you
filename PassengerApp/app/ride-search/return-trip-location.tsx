import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import LocationDualPicker from "../components/ride/LocationDualPicker";
import { useRideSearch } from "../../src/context/RideSearchContext";
import type { LocationSuggestion } from "../../src/services/location/locationSuggestionsService";

export default function ReturnTripLocationScreen() {
  const { outboundTrip, setReturnPickup, setReturnDropoff } = useRideSearch();

  const handleLocationConfirm = (
    pickup: LocationSuggestion,
    dropoff: LocationSuggestion,
  ) => {
    // Save return trip locations to context
    setReturnPickup(pickup);
    setReturnDropoff(dropoff);

    // Navigate to select ride for return trip
    router.push("/ride-search/select-ride-return");
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.title}>Return Trip</Text>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.skip}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Info Text */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={18} color="#0B7BDC" />
        <Text style={styles.infoText}>
          Your outbound drop-off will be auto-filled as the pickup for your
          return trip
        </Text>
      </View>

      {/* Location Dual Picker - Pre-filled with outbound dropoff as pickup */}
      <LocationDualPicker
        initialPickup={outboundTrip.dropoff}
        onConfirm={handleLocationConfirm}
        pickupLabel="Return From"
        dropoffLabel="Return To"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FBFF",
  },

  header: {
    marginTop: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  skip: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },

  infoBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F0F9FF",
    borderLeftWidth: 3,
    borderLeftColor: "#0B7BDC",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#0B7BDC",
    fontWeight: "500",
  },
});
