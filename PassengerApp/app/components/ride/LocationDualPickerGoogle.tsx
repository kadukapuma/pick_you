import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import type { LocationSuggestion } from "../../services/location/googlePlacesService";

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
  const [selectedPickup, setSelectedPickup] =
    useState<LocationSuggestion | null>(initialPickup || null);
  const [selectedDropoff, setSelectedDropoff] =
    useState<LocationSuggestion | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Refs for autocomplete
  const pickupInputRef = useRef<any>(null);
  const dropoffInputRef = useRef<any>(null);

  // Auto-focus dropoff when pickup is selected
  useEffect(() => {
    if (selectedPickup && dropoffInputRef.current) {
      setTimeout(() => {
        dropoffInputRef.current?.focus();
      }, 200);
    }
  }, [selectedPickup]);

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
    } catch (error) {
      console.log("Location Error:", error);
    } finally {
      setIsLoading(false);
    }
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

    // Clear refs
    if (pickupInputRef.current) {
      pickupInputRef.current?.setAddressText(selectedDropoff?.address || "");
    }
    if (dropoffInputRef.current) {
      dropoffInputRef.current?.setAddressText(selectedPickup?.address || "");
    }
  };

  const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "";

  if (!googleApiKey) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>
          Google Places API Key not configured
        </Text>
        <Text style={styles.errorSubtext}>
          Please set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY environment variable
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Pickup Location */}
      <View style={styles.locationInputWrapper}>
        <Text style={styles.label}>{pickupLabel}</Text>
        {selectedPickup ? (
          <View style={styles.selectedLocationBox}>
            <Ionicons name="location" size={20} color="#0B7BDC" />
            <View style={styles.selectedLocationText}>
              <Text style={styles.selectedAddress}>
                {selectedPickup.address}
              </Text>
              <Text style={styles.selectedDetails}>
                {selectedPickup.details}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedPickup(null)}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <GooglePlacesAutocomplete
              ref={pickupInputRef}
              placeholder={`Enter ${pickupLabel} location`}
              minLength={2}
              autoFocus={false}
              returnKeyType="search"
              listViewDisplayed={false}
              fetchDetails={true}
              onPress={(data, details = null) => {
                if (details) {
                  const location: LocationSuggestion = {
                    id: data.place_id,
                    address: data.main_text || data.description || "",
                    details:
                      data.secondary_text || details.formatted_address || "",
                    latitude: details.geometry.location.lat,
                    longitude: details.geometry.location.lng,
                    placeType: "address",
                  };
                  setSelectedPickup(location);
                }
              }}
              query={{
                key: googleApiKey,
                language: "en",
                components: "country:lk", // Restrict to Sri Lanka
              }}
              textInputProps={{
                placeholderTextColor: "#9CA3AF",
              }}
              styles={{
                textInputContainer: styles.textInputContainer,
                textInput: styles.textInput,
                listView: styles.listView,
                row: styles.row,
                description: styles.description,
              }}
              GooglePlacesDetailsQuery={{
                fields: ["geometry", "formatted_address"],
              }}
            />

            {/* Use Current Location Button */}
            {!selectedPickup && (
              <TouchableOpacity
                style={styles.currentLocationButton}
                onPress={handleUseCurrentLocation}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#0B7BDC" />
                ) : (
                  <>
                    <Ionicons
                      name="navigate-circle"
                      size={18}
                      color="#0B7BDC"
                    />
                    <Text style={styles.currentLocationText}>
                      Use current location
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
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
        <Text style={styles.label}>{dropoffLabel}</Text>
        {selectedDropoff ? (
          <View style={styles.selectedLocationBox}>
            <Ionicons name="location" size={20} color="#F97316" />
            <View style={styles.selectedLocationText}>
              <Text style={styles.selectedAddress}>
                {selectedDropoff.address}
              </Text>
              <Text style={styles.selectedDetails}>
                {selectedDropoff.details}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedDropoff(null)}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ) : (
          <GooglePlacesAutocomplete
            ref={dropoffInputRef}
            placeholder={`Enter ${dropoffLabel} location`}
            minLength={2}
            autoFocus={false}
            returnKeyType="search"
            listViewDisplayed={false}
            fetchDetails={true}
            editable={!!selectedPickup}
            onPress={(data, details = null) => {
              if (details && selectedPickup) {
                const location: LocationSuggestion = {
                  id: data.place_id,
                  address: data.main_text || data.description || "",
                  details:
                    data.secondary_text || details.formatted_address || "",
                  latitude: details.geometry.location.lat,
                  longitude: details.geometry.location.lng,
                  placeType: "address",
                };
                setSelectedDropoff(location);
              }
            }}
            query={{
              key: googleApiKey,
              language: "en",
              components: "country:lk", // Restrict to Sri Lanka
            }}
            textInputProps={{
              placeholderTextColor: "#9CA3AF",
              editable: !!selectedPickup,
            }}
            styles={{
              textInputContainer: styles.textInputContainer,
              textInput: [
                styles.textInput,
                !selectedPickup && styles.textInputDisabled,
              ],
              listView: styles.listView,
              row: styles.row,
              description: styles.description,
            }}
            GooglePlacesDetailsQuery={{
              fields: ["geometry", "formatted_address"],
            }}
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

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4FBFF",
  },

  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "500",
    textAlign: "center",
  },

  errorSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },

  locationInputWrapper: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },

  textInputContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    elevation: 2,
  },

  textInput: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },

  textInputDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.5,
  },

  listView: {
    backgroundColor: "#fff",
    marginTop: 4,
    borderRadius: 8,
    elevation: 2,
    maxHeight: 250,
  },

  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: "auto",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  description: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },

  selectedLocationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    elevation: 2,
    gap: 12,
  },

  selectedLocationText: {
    flex: 1,
  },

  selectedAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  selectedDetails: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
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
    marginTop: 20,
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
