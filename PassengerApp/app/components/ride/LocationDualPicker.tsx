import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { searchLocationSuggestions } from "../../../src/services/location/multiProviderService";
import type { LocationSuggestion } from "../../../src/services/location/multiProviderService";

interface LocationDualPickerProps {
  initialPickup?: LocationSuggestion | null;
  onConfirm: (pickup: LocationSuggestion, dropoff: LocationSuggestion) => void;
  pickupLabel?: string;
  dropoffLabel?: string;
}

export default function LocationDualPicker({
  initialPickup,
  onConfirm,
  pickupLabel = "Pickup",
  dropoffLabel = "Drop-off",
}: LocationDualPickerProps) {
  const [pickupSearch, setPickupSearch] = useState("");
  const [dropoffSearch, setDropoffSearch] = useState("");
  const [selectedPickup, setSelectedPickup] =
    useState<LocationSuggestion | null>(initialPickup || null);
  const [selectedDropoff, setSelectedDropoff] =
    useState<LocationSuggestion | null>(null);

  const [pickupSuggestions, setPickupSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<
    LocationSuggestion[]
  >([]);

  const [activeField, setActiveField] = useState<"pickup" | "dropoff" | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  // Refs for TextInput focus
  const pickupInputRef = useRef<TextInput>(null);
  const dropoffInputRef = useRef<TextInput>(null);

  // Debounce timers (React Native setTimeout returns number, not Timeout)
  const pickupDebounceTimer = useRef<number | undefined>(undefined);
  const dropoffDebounceTimer = useRef<number | undefined>(undefined);

  // Auto-focus dropoff when pickup is selected
  useEffect(() => {
    if (
      selectedPickup &&
      activeField === "dropoff" &&
      dropoffInputRef.current
    ) {
      setTimeout(() => dropoffInputRef.current?.focus(), 200);
    }
  }, [selectedPickup, activeField]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (pickupDebounceTimer.current)
        clearTimeout(pickupDebounceTimer.current);
      if (dropoffDebounceTimer.current)
        clearTimeout(dropoffDebounceTimer.current);
    };
  }, []);

  // Handle pickup search with debouncing
  const handlePickupSearch = async (query: string) => {
    setPickupSearch(query);

    // Clear previous timer
    if (pickupDebounceTimer.current) {
      clearTimeout(pickupDebounceTimer.current);
    }

    // Set new debounce timer (wait 800ms after user stops typing)
    pickupDebounceTimer.current = setTimeout(async () => {
      if (query.length > 2) {
        setIsLoading(true);
        try {
          const results = await searchLocationSuggestions(query);
          setPickupSuggestions(results);
        } catch (error) {
          console.log("Search error:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setPickupSuggestions([]);
      }
    }, 800); // Wait 800ms (optimized for free tier)
  };

  // Handle dropoff search with debouncing
  const handleDropoffSearch = async (query: string) => {
    setDropoffSearch(query);

    // Clear previous timer
    if (dropoffDebounceTimer.current) {
      clearTimeout(dropoffDebounceTimer.current);
    }

    // Set new debounce timer (wait 800ms after user stops typing)
    dropoffDebounceTimer.current = setTimeout(async () => {
      if (query.length > 2) {
        setIsLoading(true);
        try {
          const results = await searchLocationSuggestions(query);
          setDropoffSuggestions(results);
        } catch (error) {
          console.log("Search error:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setDropoffSuggestions([]);
      }
    }, 800); // Wait 800ms (optimized for free tier)
  };

  // Use current location for pickup
  const handleUseCurrentLocation = async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("Location permission denied");
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      const currentLocation: LocationSuggestion = {
        id: "current",
        address: "Your Location",
        details: "Current position",
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        placeType: "saved",
      };

      setSelectedPickup(currentLocation);
      setPickupSearch(currentLocation.address);
      setActiveField("dropoff");
    } catch (error) {
      console.log("Location Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Select pickup location
  const handleSelectPickup = (location: LocationSuggestion) => {
    setSelectedPickup(location);
    setPickupSearch(location.address);
    setPickupSuggestions([]);
    setActiveField("dropoff");
  };

  // Select dropoff location
  const handleSelectDropoff = (location: LocationSuggestion) => {
    setSelectedDropoff(location);
    setDropoffSearch(location.address);
    setDropoffSuggestions([]);
  };

  // Confirm selection
  const handleConfirm = () => {
    if (selectedPickup && selectedDropoff) {
      Keyboard.dismiss();
      onConfirm(selectedPickup, selectedDropoff);
    }
  };

  // Swap locations
  const handleSwap = () => {
    const temp = selectedPickup;
    setSelectedPickup(selectedDropoff);
    setSelectedDropoff(temp);

    const tempSearch = pickupSearch;
    setPickupSearch(dropoffSearch);
    setDropoffSearch(tempSearch);
  };

  return (
    <View style={styles.container}>
      {/* Pickup Location */}
      <View style={styles.locationInputWrapper}>
        <View style={styles.locationInputContainer}>
          <Ionicons name="location" size={20} color="#0B7BDC" />
          <TextInput
            ref={pickupInputRef}
            style={styles.input}
            placeholder={`${pickupLabel} location`}
            placeholderTextColor="#9CA3AF"
            value={pickupSearch}
            onChangeText={handlePickupSearch}
            onFocus={() => setActiveField("pickup")}
            editable={true}
          />
          {pickupSearch && (
            <TouchableOpacity onPress={() => setPickupSearch("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Use Current Location Button (only if no pickup selected) */}
        {!selectedPickup && activeField === "pickup" && (
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={handleUseCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#0B7BDC" />
            ) : (
              <>
                <Ionicons name="navigate-circle" size={18} color="#0B7BDC" />
                <Text style={styles.currentLocationText}>
                  Use current location
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Pickup Suggestions */}
        {activeField === "pickup" && pickupSuggestions.length > 0 && (
          <FlatList
            data={pickupSuggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectPickup(item)}
              >
                <Ionicons name="location" size={16} color="#6B7280" />
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionAddress}>{item.address}</Text>
                  <Text style={styles.suggestionDetails}>{item.details}</Text>
                </View>
              </TouchableOpacity>
            )}
            scrollEnabled={false}
            style={styles.suggestionsList}
          />
        )}
      </View>

      {/* Swap Button */}
      {selectedPickup && selectedDropoff && (
        <TouchableOpacity style={styles.swapButton} onPress={handleSwap}>
          <Ionicons name="swap-vertical" size={20} color="#0B7BDC" />
        </TouchableOpacity>
      )}

      {/* Dropoff Location */}
      <View style={styles.locationInputWrapper}>
        <View style={styles.locationInputContainer}>
          <Ionicons name="location" size={20} color="#F97316" />
          <TextInput
            ref={dropoffInputRef}
            style={styles.input}
            placeholder={`${dropoffLabel} location`}
            placeholderTextColor="#9CA3AF"
            value={dropoffSearch}
            onChangeText={handleDropoffSearch}
            onFocus={() => setActiveField("dropoff")}
            editable={true}
          />
          {dropoffSearch && (
            <TouchableOpacity onPress={() => setDropoffSearch("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Dropoff Suggestions */}
        {activeField === "dropoff" && dropoffSuggestions.length > 0 && (
          <FlatList
            data={dropoffSuggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectDropoff(item)}
              >
                <Ionicons name="location" size={16} color="#6B7280" />
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionAddress}>{item.address}</Text>
                  <Text style={styles.suggestionDetails}>{item.details}</Text>
                </View>
              </TouchableOpacity>
            )}
            scrollEnabled={false}
            style={styles.suggestionsList}
          />
        )}
      </View>

      {/* Confirm Button */}
      <TouchableOpacity
        style={[
          styles.confirmButton,
          !selectedPickup || !selectedDropoff
            ? styles.confirmButtonDisabled
            : {},
        ]}
        onPress={handleConfirm}
        disabled={!selectedPickup || !selectedDropoff}
      >
        <Text style={styles.confirmButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FBFF",
    padding: 16,
    justifyContent: "flex-start",
  },

  locationInputWrapper: {
    marginBottom: 16,
  },

  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    elevation: 2,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    marginHorizontal: 8,
  },

  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
  },

  currentLocationText: {
    color: "#0B7BDC",
    fontSize: 14,
    fontWeight: "500",
  },

  suggestionsList: {
    backgroundColor: "#fff",
    marginTop: 4,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 1,
  },

  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  suggestionContent: {
    flex: 1,
    marginLeft: 8,
  },

  suggestionAddress: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },

  suggestionDetails: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  swapButton: {
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 8,
    elevation: 2,
  },

  confirmButton: {
    backgroundColor: "#0B7BDC",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },

  confirmButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },

  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
