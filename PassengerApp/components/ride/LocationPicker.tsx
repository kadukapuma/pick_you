import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import {
  createPlacesSessionToken,
  LocationSuggestion,
  resolveLocationSuggestion,
  searchLocationSuggestions,
} from "../../services/location/multiProviderService";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useSavedPlaces } from "../../hooks/useSavedPlaces";

const getPlaceConfig = (type: string) => {
  switch (type) {
    case "home":
      return { icon: "home-outline" as const, color: "#22B36A" };
    case "office":
      return { icon: "briefcase-outline" as const, color: "#3BAAE8" };
    default:
      return { icon: "location-outline" as const, color: "#F59E0B" };
  }
};

interface LocationPickerProps {
  onConfirm: (
    pickup: LocationSuggestion,
    destination: LocationSuggestion,
  ) => void;
  currentLocation?: LocationSuggestion;
}

const QUICK_SAVED = [
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
    details: "Western Province",
    latitude: 6.927,
    longitude: 79.861,
    placeType: "saved" as const,
  },
  {
    id: "kandy",
    address: "Kandy",
    details: "Central Province",
    latitude: 7.29,
    longitude: 80.633,
    placeType: "saved" as const,
  },
  {
    id: "katugastota",
    address: "อพสัมมาบุคคล",
    details: "Road, Katugastota",
    latitude: 7.32,
    longitude: 80.62,
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
  
  const { places } = useSavedPlaces();

  const [pickupSearch, setPickupSearch] = useState(
    currentLocation?.address || "",
  );
  const [dropSearch, setDropSearch] = useState("");

  const [activeField, setActiveField] = useState<"pickup" | "drop" | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounceTimer = useRef<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const sessionTokens = useRef<Record<"pickup" | "drop", string>>({
    pickup: createPlacesSessionToken(),
    drop: createPlacesSessionToken(),
  });

  const resetSessionToken = (field: "pickup" | "drop") => {
    sessionTokens.current[field] = createPlacesSessionToken();
  };

  const handleSearch = (text: string, field: "pickup" | "drop") => {
    if (field === "pickup") setPickupSearch(text);
    if (field === "drop") setDropSearch(text);

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
      if (destination && destination.id === pickup?.id) {
        setDestination(null);
        setDropSearch("");
      }
    } else if (activeField === "drop") {
      setDestination(resolvedLocation);
      setDropSearch(resolvedLocation.address);
    }
    resetSessionToken(activeField);
    setActiveField(null);
    setSuggestions([]);
  };

  const handleFieldFocus = (field: "pickup" | "drop") => {
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

  const handleSetSameAsPickup = () => {
    if (pickup) {
      setDestination(pickup);
      setDropSearch(pickup.address);
    }
  };

  const handleSwapLocations = () => {
    const tempPickup = pickup;
    const tempPickupSearch = pickupSearch;
    setPickup(destination);
    setPickupSearch(dropSearch);
    setDestination(tempPickup);
    setDropSearch(tempPickupSearch);
  };

  const renderField = (
    label: string,
    value: string,
    field: "pickup" | "drop",
    placeholder: string,
    selectedLocation: LocationSuggestion | null,
  ) => {
    const isActive = activeField === field;
    const hasValue = !!selectedLocation;

    return (
      <View style={styles.fieldWrapper}>
        <Text style={styles.label}>{label}</Text>

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
                  if (field === "drop") {
                    setDropSearch("");
                    setDestination(null);
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
        <View style={styles.fieldsRow}>
          <View style={styles.inputsColumn}>
            {/* Pickup Field */}
            {renderField("From", pickupSearch, "pickup", "Your Location", pickup)}

            {/* Dropoff Field */}
            {renderField("To", dropSearch, "drop", "Where to?", destination)}
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
        {activeField &&
          suggestions.some((suggestion) => suggestion.provider === "google") && (
            <Text style={styles.googleAttribution}>Powered by Google</Text>
          )}

        {/* Saved Addresses Section */}
        {!activeField && (
          <View style={styles.savedSection}>
            <View style={styles.savedHeader}>
              <Text style={styles.savedTitle}>Saved Locations</Text>
              <Ionicons name="chevron-forward" size={20} color="#38765D" style={{ paddingHorizontal: 16 }} />
            </View>

            <TouchableOpacity
              style={styles.savedItem}
              onPress={() => {
                router.push({
                  pathname: "/ride-search/set-location-map" as any,
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
                color="#1B9E6E"
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
                      setDropSearch(suggestion.address);
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
          <Text style={styles.confirmText}>SEARCH FOR RIDES</Text>
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
    paddingTop: 8,
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
  },
  dotHollow: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    backgroundColor: "#FFFFFF",
  },
  dashedLine: {
    width: 1,
    height: 22,
    borderLeftWidth: 1.5,
    borderColor: "#9CA3AF",
    borderStyle: "dashed",
    marginVertical: 4,
  },
  swapButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#38765D",
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "#38765D",
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});
