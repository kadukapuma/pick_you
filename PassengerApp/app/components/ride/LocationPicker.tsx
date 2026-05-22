import { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  searchLocationSuggestions,
  LocationSuggestion,
} from "../../services/location/multiProviderService";

interface LocationPickerProps {
  onConfirm: (
    pickup: LocationSuggestion,
    destination: LocationSuggestion,
  ) => void;
  currentLocation?: LocationSuggestion;
}

const SAVED_LOCATIONS = [
  {
    id: "home",
    address: "Add Home",
    details: "",
    latitude: 0,
    longitude: 0,
    placeType: "saved" as const,
  },
  {
    id: "work",
    address: "Add Work",
    details: "",
    latitude: 0,
    longitude: 0,
    placeType: "saved" as const,
  },
];

const QUICK_SAVED = [
  {
    id: "kcc",
    address: "Kcc",
    details: "Kandy",
    latitude: 6.9271,
    longitude: 80.7789,
    placeType: "saved" as const,
  },
];

export default function LocationPicker({
  onConfirm,
  currentLocation,
}: LocationPickerProps) {
  const [pickup, setPickup] = useState<LocationSuggestion | null>(
    currentLocation || null,
  );
  const [destination, setDestination] = useState<LocationSuggestion | null>(
    null,
  );

  const [pickupSearch, setPickupSearch] = useState("");
  const [dropSearch, setDropSearch] = useState("");

  const [pickupSuggestions, setPickupSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [dropSuggestions, setDropSuggestions] = useState<LocationSuggestion[]>(
    [],
  );

  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropSuggestions, setShowDropSuggestions] = useState(false);

  const [isLoadingPickup, setIsLoadingPickup] = useState(false);
  const [isLoadingDrop, setIsLoadingDrop] = useState(false);

  // Debounce timers for API call optimization
  const pickupDebounceTimer = useRef<number | null>(null);
  const dropDebounceTimer = useRef<number | null>(null);

  const handlePickupSearch = (text: string) => {
    setPickupSearch(text);

    // Clear previous timer
    if (pickupDebounceTimer.current) {
      clearTimeout(pickupDebounceTimer.current);
    }

    if (!text.trim() || text.length < 3) {
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
      return;
    }

    // Set new debounce timer (800ms - optimized for free tier)
    pickupDebounceTimer.current = setTimeout(async () => {
      setIsLoadingPickup(true);
      try {
        const results = await searchLocationSuggestions(text);
        setPickupSuggestions(results);
        setShowPickupSuggestions(true);
      } catch (error) {
        console.log("Search error:", error);
      } finally {
        setIsLoadingPickup(false);
      }
    }, 800);
  };

  const handleDropSearch = (text: string) => {
    setDropSearch(text);

    // Clear previous timer
    if (dropDebounceTimer.current) {
      clearTimeout(dropDebounceTimer.current);
    }

    if (!text.trim() || text.length < 3) {
      setDropSuggestions([]);
      setShowDropSuggestions(false);
      return;
    }

    // Set new debounce timer (800ms - optimized for free tier)
    dropDebounceTimer.current = setTimeout(async () => {
      setIsLoadingDrop(true);
      try {
        const results = await searchLocationSuggestions(text);
        setDropSuggestions(results);
        setShowDropSuggestions(true);
      } catch (error) {
        console.log("Search error:", error);
      } finally {
        setIsLoadingDrop(false);
      }
    }, 800);
  };

  const handleSelectPickup = (location: LocationSuggestion) => {
    setPickup(location);
    setPickupSearch(location.address);
    setShowPickupSuggestions(false);
  };

  const handleSelectDrop = (location: LocationSuggestion) => {
    setDestination(location);
    setDropSearch(location.address);
    setShowDropSuggestions(false);
  };

  const handleConfirm = () => {
    if (pickup && destination) {
      onConfirm(pickup, destination);
    }
  };

  return (
    <View style={styles.container}>
      {/* Location Inputs */}
      <View style={styles.inputsSection}>
        {/* Pickup Input */}
        <View style={styles.inputWrapper}>
          <View style={styles.dotPickup} />
          <TextInput
            placeholder="Your Location"
            placeholderTextColor="#999"
            value={pickupSearch}
            onChangeText={handlePickupSearch}
            onFocus={() => setShowPickupSuggestions(true)}
            style={styles.input}
          />
          {pickupSearch && (
            <TouchableOpacity
              onPress={() => {
                setPickupSearch("");
                setPickup(null);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Line */}
        <View style={styles.line} />

        {/* Drop Input */}
        <View style={styles.inputWrapper}>
          <View style={styles.dotDrop} />
          <TextInput
            placeholder="Where are you going?"
            placeholderTextColor="#999"
            value={dropSearch}
            onChangeText={handleDropSearch}
            onFocus={() => setShowDropSuggestions(true)}
            style={styles.input}
          />
          {dropSearch && (
            <TouchableOpacity
              onPress={() => {
                setDropSearch("");
                setDestination(null);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
          <TouchableOpacity>
            <Ionicons name="add" size={24} color="#0B7BDC" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Suggestions Dropdown */}
      <ScrollView
        style={styles.suggestionsWrapper}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {/* Pickup Suggestions */}
        {showPickupSuggestions && (
          <View>
            {isLoadingPickup ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0B7BDC" />
              </View>
            ) : pickupSuggestions.length > 0 ? (
              <View>
                {pickupSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectPickup(suggestion)}
                  >
                    <Ionicons name="location-sharp" size={20} color="#0B7BDC" />
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionTitle}>
                        {suggestion.address}
                      </Text>
                      <Text style={styles.suggestionDetails}>
                        {suggestion.details}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#D1D5DB"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : pickupSearch ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No locations found</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Drop Suggestions */}
        {showDropSuggestions && (
          <View>
            {isLoadingDrop ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0B7BDC" />
              </View>
            ) : dropSuggestions.length > 0 ? (
              <View>
                {dropSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectDrop(suggestion)}
                  >
                    <Ionicons name="location-sharp" size={20} color="#0B7BDC" />
                    <View style={styles.suggestionText}>
                      <Text style={styles.suggestionTitle}>
                        {suggestion.address}
                      </Text>
                      <Text style={styles.suggestionDetails}>
                        {suggestion.details}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#D1D5DB"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : dropSearch ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No locations found</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Options (show when no suggestions) */}
        {!showPickupSuggestions && !showDropSuggestions && (
          <View style={styles.optionsSection}>
            {/* Saved Addresses */}
            <TouchableOpacity style={styles.optionItem}>
              <Ionicons name="heart-outline" size={24} color="#0B7BDC" />
              <Text style={styles.optionText}>Saved Addresses</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Set Location on Map */}
            <TouchableOpacity style={styles.optionItem}>
              <Ionicons name="locate-outline" size={24} color="#111827" />
              <Text style={styles.optionText}>Set location on map</Text>
            </TouchableOpacity>

            {/* Quick Locations */}
            <View style={styles.divider} />

            {/* Add Home */}
            <TouchableOpacity style={styles.optionItem}>
              <Ionicons name="home-outline" size={24} color="#FFA500" />
              <Text style={styles.optionText}>Add Home</Text>
              <Ionicons name="add" size={24} color="#0B7BDC" />
            </TouchableOpacity>

            {/* Add Work */}
            <TouchableOpacity style={styles.optionItem}>
              <Ionicons name="briefcase-outline" size={24} color="#FF9500" />
              <Text style={styles.optionText}>Add Work</Text>
              <Ionicons name="add" size={24} color="#0B7BDC" />
            </TouchableOpacity>

            {/* Saved Quick Locations */}
            {QUICK_SAVED.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={styles.optionItem}
                onPress={() => handleSelectDrop(location)}
              >
                <Ionicons name="location" size={24} color="#FFA500" />
                <View style={styles.locationInfo}>
                  <Text style={styles.optionText}>{location.address}</Text>
                  <Text style={styles.locationDetail}>{location.details}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      {pickup && destination && (
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmText}>Confirm Location</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FBFF",
  },

  inputsSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    elevation: 2,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  dotPickup: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },

  dotDrop: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F97316",
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    padding: 0,
  },

  line: {
    width: 1,
    height: 25,
    backgroundColor: "#D1D5DB",
    marginLeft: 5,
    marginVertical: 8,
  },

  suggestionsWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 8,
  },

  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },

  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
    gap: 12,
  },

  suggestionText: {
    flex: 1,
  },

  suggestionTitle: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },

  suggestionDetails: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  noResults: {
    paddingVertical: 24,
    alignItems: "center",
  },

  noResultsText: {
    fontSize: 14,
    color: "#6B7280",
  },

  optionsSection: {
    marginBottom: 16,
  },

  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    marginVertical: 4,
    borderRadius: 12,
    gap: 12,
  },

  optionText: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },

  locationInfo: {
    flex: 1,
  },

  locationDetail: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },

  confirmButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#FBBF24",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    elevation: 3,
  },

  confirmText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});
