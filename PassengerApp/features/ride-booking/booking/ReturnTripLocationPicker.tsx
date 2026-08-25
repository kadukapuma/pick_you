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
  createPlacesSessionToken,
  resolveLocationSuggestion,
  searchLocationSuggestions,
  LocationSuggestion,
} from "../../../services/maps/placesApi";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useSavedPlaces } from "../../../hooks/useSavedPlaces";

const getPlaceConfig = (type: string) => {
  switch (type) {
    case "home":
      return { icon: "home-outline" as const, color: "#20B768" };
    case "office":
      return { icon: "briefcase-outline" as const, color: "#3BAAE8" };
    default:
      return { icon: "location-outline" as const, color: "#F59E0B" };
  }
};

interface ReturnLocationPickerProps {
  // A return trip is pickup -> destination -> pickup: the driver waits at the
  // destination and brings the passenger straight back, so only two locations
  // are ever collected here (the return drop is always the pickup point).
  onConfirm: (
    pickup: LocationSuggestion,
    destination: LocationSuggestion,
  ) => void;
  currentLocation?: LocationSuggestion;
}

export default function ReturnLocationPicker({
  onConfirm,
  currentLocation,
}: ReturnLocationPickerProps) {
  const [pickup, setPickup] = useState<LocationSuggestion | null>(
    currentLocation ?? null,
  );
  const [destination, setDestination] = useState<LocationSuggestion | null>(
    null,
  );

  const { places } = useSavedPlaces();

  const [pickupSearch, setPickupSearch] = useState(
    currentLocation?.address || "",
  );
  const [destinationSearch, setDestinationSearch] = useState("");

  const [activeField, setActiveField] = useState<
    "pickup" | "destination" | null
  >(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const sessionTokens = useRef<Record<"pickup" | "destination", string>>({
    pickup: createPlacesSessionToken(),
    destination: createPlacesSessionToken(),
  });

  const resetSessionToken = (field: "pickup" | "destination") => {
    sessionTokens.current[field] = createPlacesSessionToken();
  };

  const handleSearch = (text: string, field: "pickup" | "destination") => {
    if (field === "pickup") setPickupSearch(text);
    if (field === "destination") setDestinationSearch(text);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim() || text.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchLocationSuggestions(text, {
          sessionToken: sessionTokens.current[field],
        });
        setSuggestions(results);
      } catch (error) {
        console.log("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const handleSelectLocation = async (location: LocationSuggestion) => {
    if (!activeField) return;
    setIsLoading(true);
    const resolvedLocation = await resolveLocationSuggestion(
      location,
      sessionTokens.current[activeField],
    );
    setIsLoading(false);

    if (!resolvedLocation) return;

    if (activeField === "pickup") {
      setPickup(resolvedLocation);
      setPickupSearch(resolvedLocation.address);
    } else {
      setDestination(resolvedLocation);
      setDestinationSearch(resolvedLocation.address);
    }
    resetSessionToken(activeField);
    setActiveField(null);
    setSuggestions([]);
  };

  const handleFieldFocus = (field: "pickup" | "destination") => {
    setActiveField(field);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleConfirm = () => {
    if (pickup && destination) {
      onConfirm(pickup, destination);
    }
  };

  const handleSwapLocations = () => {
    const tempPickup = pickup;
    const tempPickupSearch = pickupSearch;
    setPickup(destination);
    setPickupSearch(destinationSearch);
    setDestination(tempPickup);
    setDestinationSearch(tempPickupSearch);
  };

  const renderField = (
    label: string,
    value: string,
    field: "pickup" | "destination",
    placeholder: string,
    selectedLocation: LocationSuggestion | null,
  ) => {
    const isActive = activeField === field;
    const hasValue = !!selectedLocation;

    return (
      <View style={styles.fieldWrapper}>
        <Text style={styles.label}>{label}</Text>

        <View style={styles.inputContainer}>
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
                    } else {
                      setDestinationSearch("");
                      setDestination(null);
                    }
                    resetSessionToken(field);
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
                <Ionicons name="create-outline" size={18} color="#20B768" />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.valueWrapper}
              onPress={() => handleFieldFocus(field)}
            >
              <Text style={styles.placeholderText}>{placeholder}</Text>
              <Ionicons name="chevron-forward" size={20} color="#20B768" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.fieldsRow}>
          <View style={styles.inputsColumn}>
            {/* Pickup Field */}
            {renderField("From", pickupSearch, "pickup", "Your Location", pickup)}

            {/* Destination Field */}
            {renderField(
              "Destination",
              destinationSearch,
              "destination",
              "Where are you going?",
              destination,
            )}
          </View>

          <View style={styles.decorationColumn}>
            <View style={styles.dotGrey} />
            <View style={styles.dashedLine} />
            <TouchableOpacity style={styles.swapButton} onPress={handleSwapLocations}>
              <Ionicons name="swap-vertical" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.dashedLine} />
            <View style={styles.dotHollow} />
          </View>
        </View>

        <View style={styles.returnNote}>
          <Ionicons name="repeat" size={16} color="#159A5B" />
          <Text style={styles.returnNoteText}>
            Your driver will wait at the destination and bring you back to the
            pickup point.
          </Text>
        </View>

        {/* Suggestions */}
        {activeField && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#20B768" />
              </View>
            ) : (
              suggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectLocation(suggestion)}
                >
                  <Ionicons name="location-outline" size={20} color="#20B768" />
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
        {activeField &&
          suggestions.some((suggestion) => suggestion.provider === "google") && (
            <Text style={styles.googleAttribution}>Powered by Google</Text>
          )}

        {/* Saved Addresses Section */}
        {!activeField && (
          <View style={styles.savedSection}>
            <View style={styles.savedHeader}>
              <Text style={styles.savedTitle}>Saved Locations</Text>
              <Ionicons name="chevron-forward" size={20} color="#20B768" style={{ paddingHorizontal: 16 }} />
            </View>

            <TouchableOpacity
              style={styles.savedItem}
              onPress={() => {
                router.push({
                  pathname: "/ride-booking/location-map" as any,
                  params: {
                    pickupAddress: pickup?.address || "Your Location",
                    pickupLat: pickup?.latitude ? String(pickup.latitude) : "",
                    pickupLng: pickup?.longitude ? String(pickup.longitude) : "",
                  },
                });
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="map-outline"
                size={26}
                color="#20B768"
                style={{ opacity: 0.8 }}
              />
              <Text style={styles.savedText}>Set Location on Map</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {places.map((place) => {
              const cfg = getPlaceConfig(place.type);
              return (
                <TouchableOpacity
                  key={place.id}
                  style={styles.savedItem}
                  onPress={async () => {
                    let lat = place.latitude;
                    let lng = place.longitude;
                    if (!lat || !lng) {
                      try {
                        const geocoded = await Location.geocodeAsync(place.address);
                        if (geocoded && geocoded.length > 0) {
                          lat = geocoded[0].latitude;
                          lng = geocoded[0].longitude;
                        }
                      } catch {}
                    }
                    const suggestion: LocationSuggestion = {
                      id: place.id,
                      address: place.address,
                      details: place.label,
                      latitude: lat || 7.2906,
                      longitude: lng || 80.6337,
                      placeType: "address",
                    };
                    if (activeField === "pickup" || (!pickup && activeField === null)) {
                      setPickup(suggestion);
                      setPickupSearch(suggestion.address);
                    } else {
                      setDestination(suggestion);
                      setDestinationSearch(suggestion.address);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={cfg.icon} size={24} color={cfg.color} />
                  <View style={styles.locationInfo}>
                    <Text style={styles.savedText}>{place.label}</Text>
                    <Text style={styles.locationDetail}>{place.address}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      {pickup && destination && !activeField && (
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
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  scrollContent: {
    paddingBottom: 92,
  },
  fieldsRow: {
    flexDirection: "row",
    marginBottom: 20,
    marginTop: 4,
  },
  inputsColumn: {
    flex: 1,
    paddingRight: 12,
  },
  decorationColumn: {
    width: 32,
    alignItems: "center",
    paddingTop: 28,
  },
  dotGrey: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#9CA3AF",
    marginVertical: 4,
  },
  dotHollow: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    backgroundColor: "#FFFFFF",
    marginVertical: 4,
  },
  dashedLine: {
    width: 1,
    height: 38,
    borderLeftWidth: 1.5,
    borderColor: "#9CA3AF",
    borderStyle: "dashed",
    marginVertical: 2,
  },
  swapButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#20B768",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 4,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingBottom: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    paddingVertical: 2,
  },
  valueWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  valueText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  placeholderText: {
    fontSize: 16,
    color: "#9CA3AF",
    flex: 1,
  },
  editIcon: {
    padding: 4,
  },
  returnNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#E8F8F0",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  returnNoteText: {
    flex: 1,
    fontSize: 12.5,
    color: "#0D4F3C",
    lineHeight: 17,
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
  googleAttribution: {
    alignSelf: "flex-end",
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 12,
    marginRight: 12,
  },
  savedSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 100,
  },
  savedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  savedTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    paddingHorizontal: 0,
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
    fontSize: 16,
    color: "#000000",
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
    backgroundColor: "#20B768",
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
