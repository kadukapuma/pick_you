import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  searchLocationSuggestions,
  LocationSuggestion,
} from "../../../src/services/location/multiProviderService";

interface ReturnLocationPickerProps {
  onConfirm: (
    pickup: LocationSuggestion,
    stop: LocationSuggestion | null,
    dropoff: LocationSuggestion,
  ) => void;
  currentLocation: LocationSuggestion;
}

const SAVED_LOCATIONS = [
  {
    id: "royal_gym",
    address: "Royal Gym Walala",
    details: "Walala Road, Menikhinna",
    latitude: 7.287,
    longitude: 80.625,
    placeType: "saved" as const,
  },
  {
    id: "kcc",
    address: "KCC Multiplex",
    details: "Sri Dalada Veediya, Kandy",
    latitude: 7.293,
    longitude: 80.634,
    placeType: "saved" as const,
  },
  {
    id: "colombo",
    address: "Colombo",
    details: "",
    latitude: 6.927,
    longitude: 79.861,
    placeType: "saved" as const,
  },
  {
    id: "kandy",
    address: "Kandy",
    details: "",
    latitude: 7.29,
    longitude: 80.633,
    placeType: "saved" as const,
  },
];

export default function ReturnLocationPicker({
  onConfirm,
  currentLocation,
}: ReturnLocationPickerProps) {
  const [pickup, setPickup] = useState<LocationSuggestion | null>(
    currentLocation,
  );
  const [stop, setStop] = useState<LocationSuggestion | null>(null);
  const [dropoff, setDropoff] = useState<LocationSuggestion | null>(null);

  const [pickupSearch, setPickupSearch] = useState(
    currentLocation?.address || "",
  );
  const [stopSearch, setStopSearch] = useState("");
  const [dropSearch, setDropSearch] = useState("");

  const [activeField, setActiveField] = useState<
    "pickup" | "stop" | "drop" | null
  >(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounceTimer = useRef<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSearch = (text: string, field: "pickup" | "stop" | "drop") => {
    if (field === "pickup") setPickupSearch(text);
    if (field === "stop") setStopSearch(text);
    if (field === "drop") setDropSearch(text);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim() || text.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchLocationSuggestions(text);
        setSuggestions(results);
      } catch (error) {
        console.log("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const handleSelectLocation = (location: LocationSuggestion) => {
    if (activeField === "pickup") {
      setPickup(location);
      setPickupSearch(location.address);
    } else if (activeField === "stop") {
      setStop(location);
      setStopSearch(location.address);
    } else if (activeField === "drop") {
      setDropoff(location);
      setDropSearch(location.address);
    }
    setActiveField(null);
    setSuggestions([]);
  };

  const handleFieldFocus = (field: "pickup" | "stop" | "drop") => {
    setActiveField(field);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleConfirm = () => {
    if (pickup && dropoff) {
      onConfirm(pickup, stop, dropoff);
    }
  };

  const renderField = (
    label: string,
    icon: string,
    iconColor: string,
    value: string,
    field: "pickup" | "stop" | "drop",
    placeholder: string,
    selectedLocation: LocationSuggestion | null,
    isOptional: boolean = false,
  ) => {
    const isActive = activeField === field;
    const hasValue = !!selectedLocation;

    return (
      <View style={styles.fieldWrapper}>
        {/* Vertical dotted line for visual connection */}
        {field !== "pickup" && (
          <View style={styles.dottedLineContainer}>
            <View style={styles.dottedLine} />
          </View>
        )}

        <View style={[styles.fieldCard, isActive && styles.fieldCardActive]}>
          <View style={styles.fieldRow}>
            <View style={styles.labelContainer}>
              <Ionicons name={icon as any} size={18} color={iconColor} />
              <Text style={styles.label}>{label}</Text>
            </View>

            {isActive ? (
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor="#B0C4C4"
                  value={value}
                  onChangeText={(text) => handleSearch(text, field)}
                  autoFocus
                  returnKeyType="search"
                />
                {value.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      if (field === "pickup") {
                        setPickupSearch("");
                        setPickup(null);
                      }
                      if (field === "stop") {
                        setStopSearch("");
                        setStop(null);
                      }
                      if (field === "drop") {
                        setDropSearch("");
                        setDropoff(null);
                      }
                      setSuggestions([]);
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#B0C4C4" />
                  </TouchableOpacity>
                )}
              </View>
            ) : hasValue ? (
              <TouchableOpacity
                style={styles.valueWrapper}
                onPress={() => handleFieldFocus(field)}
              >
                <Text style={styles.valueText} numberOfLines={1}>
                  {selectedLocation.address}
                </Text>
                <View style={styles.editIcon}>
                  <Ionicons name="create-outline" size={18} color="#1B9E6E" />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.valueWrapper}
                onPress={() => handleFieldFocus(field)}
              >
                <Text style={styles.placeholderText}>{placeholder}</Text>
                <Ionicons name="chevron-forward" size={20} color="#1B9E6E" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Pickup Field */}
        {renderField(
          "PICKUP",
          "location-outline",
          "#1B9E6E",
          pickupSearch,
          "pickup",
          "Your Location",
          pickup,
          false,
        )}

        {/* Stop Field (Optional) */}
        {renderField(
          "STOP",
          "location-outline",
          "#FFA500",
          stopSearch,
          "stop",
          "Add a stop",
          stop,
          true,
        )}

        {/* Dropoff Field */}
        {renderField(
          "DROP",
          "flag-outline",
          "#FF6B6B",
          dropSearch,
          "drop",
          "Where are you going?",
          dropoff,
          false,
        )}

        {/* Same as pickup option */}
        {pickup && !dropoff && !activeField && (
          <TouchableOpacity
            style={styles.sameAsPickup}
            onPress={() => {
              setDropoff(pickup);
              setDropSearch(pickup.address);
            }}
          >
            <Ionicons name="sync-outline" size={18} color="#1B9E6E" />
            <Text style={styles.sameAsPickupText}>Same as pickup</Text>
          </TouchableOpacity>
        )}

        {/* Suggestions */}
        {activeField && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#1B9E6E" />
              </View>
            ) : (
              suggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectLocation(suggestion)}
                >
                  <Ionicons name="location-outline" size={20} color="#1B9E6E" />
                  <View style={styles.suggestionText}>
                    <Text style={styles.suggestionTitle}>
                      {suggestion.address}
                    </Text>
                    {suggestion.details && (
                      <Text style={styles.suggestionDetails}>
                        {suggestion.details}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Saved Addresses Section */}
        {!activeField && (
          <View style={styles.savedSection}>
            <Text style={styles.savedTitle}>Saved Addresses</Text>

            <TouchableOpacity style={styles.savedItem}>
              <Ionicons name="map-outline" size={22} color="#1B9E6E" />
              <Text style={styles.savedText}>Set location on map</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.savedItem}>
              <Ionicons name="home-outline" size={22} color="#FFA500" />
              <Text style={styles.savedText}>Home</Text>
              <Text style={styles.savedSubtext}>Kurunegala</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.savedItem}>
              <Ionicons name="briefcase-outline" size={22} color="#FF9500" />
              <Text style={styles.savedText}>Add Work</Text>
              <Ionicons name="add-circle-outline" size={22} color="#1B9E6E" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {SAVED_LOCATIONS.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={styles.savedItem}
                onPress={() => {
                  if (!pickup) {
                    setPickup(location);
                    setPickupSearch(location.address);
                  } else if (!dropoff) {
                    setDropoff(location);
                    setDropSearch(location.address);
                  }
                }}
              >
                <Ionicons name="location" size={22} color="#6B9E8E" />
                <View style={styles.locationInfo}>
                  <Text style={styles.savedText}>{location.address}</Text>
                  {location.details ? (
                    <Text style={styles.locationDetail}>
                      {location.details}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      {pickup && dropoff && !activeField && (
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirm Return Trip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0FAF5",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  fieldWrapper: {
    marginBottom: 4,
  },
  dottedLineContainer: {
    alignItems: "center",
    marginLeft: 20,
    marginBottom: 4,
  },
  dottedLine: {
    width: 2,
    height: 24,
    backgroundColor: "transparent",
    borderLeftWidth: 2,
    borderLeftColor: "#D1D5DB",
    borderStyle: "dotted",
  },
  fieldCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#0D4F3C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  fieldCardActive: {
    borderWidth: 1,
    borderColor: "#1B9E6E",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 85,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B9E8E",
    letterSpacing: 1,
  },
  optionalBadge: {
    fontSize: 9,
    color: "#FFA500",
    fontWeight: "500",
    marginLeft: 4,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0D4F3C",
    paddingVertical: 4,
  },
  valueWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueText: {
    fontSize: 14,
    color: "#0D4F3C",
    fontWeight: "500",
    flex: 1,
  },
  editIcon: {
    padding: 4,
  },
  placeholderText: {
    fontSize: 14,
    color: "#B0C4C4",
    flex: 1,
  },
  sameAsPickup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  sameAsPickupText: {
    fontSize: 14,
    color: "#1B9E6E",
    fontWeight: "600",
  },
  suggestionsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
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
    borderBottomWidth: 1,
    borderBottomColor: "#F0FAF5",
    gap: 12,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 15,
    color: "#0D4F3C",
    fontWeight: "600",
  },
  suggestionDetails: {
    fontSize: 12,
    color: "#6B9E8E",
    marginTop: 2,
  },
  savedSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 100,
  },
  savedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B9E8E",
    paddingHorizontal: 16,
    paddingVertical: 12,
    letterSpacing: 0.5,
  },
  savedItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  savedText: {
    flex: 1,
    fontSize: 15,
    color: "#0D4F3C",
    fontWeight: "500",
  },
  savedSubtext: {
    fontSize: 12,
    color: "#6B9E8E",
    marginRight: 8,
  },
  locationInfo: {
    flex: 1,
  },
  locationDetail: {
    fontSize: 12,
    color: "#6B9E8E",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#E8F3EF",
    marginVertical: 8,
  },
  confirmButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#1B9E6E",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#1B9E6E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
