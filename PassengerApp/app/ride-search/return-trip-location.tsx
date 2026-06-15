import { useRouter } from "expo-router";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ReturnLocationPicker from "../components/ride/ReturnLocationPicker";
import { useRideSearch } from "../../src/context/RideSearchContext";
import { LocationSuggestion } from "../../src/services/location/locationSuggestionsService";

export default function ReturnTripLocationScreen() {
  const router = useRouter();
  const { outboundTrip, setReturnPickup, setReturnDropoff, setReturnStop } =
    useRideSearch();

  // Default: return pickup = where outbound trip dropped you off
  const defaultPickup: LocationSuggestion | null = outboundTrip.dropoff;

  if (!defaultPickup) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Outbound trip data missing</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Auto-fires once ReturnLocationPicker's internal useEffect
  // detects pickup + dropoff are both set
  const handleConfirm = (
    pickup: LocationSuggestion,
    stop: LocationSuggestion | null,
    dropoff: LocationSuggestion,
  ) => {
    setReturnPickup(pickup);
    setReturnDropoff(dropoff);
    setReturnStop(stop);
    router.push("/ride-search/select-ride-return");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0D4F3C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan Return Trip</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ReturnLocationPicker
        onConfirm={handleConfirm}
        currentLocation={defaultPickup}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FAF5" },
  header: {
    marginTop: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0D4F3C" },
  headerSpacer: { width: 40 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0FAF5",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "500",
  },
  backButton: {
    marginTop: 20,
    backgroundColor: "#1B9E6E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: { color: "#fff", fontWeight: "600" },
});
