import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useRideSearch, type RideOption } from "../context/RideSearchContext";
import {
  getCachedDirections_withCache,
  type DirectionsResult,
} from "../services/routing/mapboxRoutingService";
import { apiClient } from "../services/api/apiClient";

interface DBVehicleType {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  fare_config: {
    id: number;
    vehicle_type: string;
    base_fare: string;
    per_km_rate: string;
    per_minute_rate: string;
    cancellation_fee: string;
    is_active: boolean;
  } | null;
}

const MOCK_VEHICLE_TYPES: DBVehicleType[] = [
  {
    id: 1,
    name: "car",
    display_name: "Car",
    description: "Standard 4-seater cars and hatchbacks",
    is_active: true,
    fare_config: {
      id: 1,
      vehicle_type: "car",
      base_fare: "150.00",
      per_km_rate: "80.00",
      per_minute_rate: "5.00",
      cancellation_fee: "50.00",
      is_active: true,
    }
  },
  {
    id: 2,
    name: "tuk",
    display_name: "Tuk Tuk",
    description: "Classic 3-wheeler auto rickshaws",
    is_active: true,
    fare_config: {
      id: 2,
      vehicle_type: "tuk",
      base_fare: "100.00",
      per_km_rate: "60.00",
      per_minute_rate: "5.00",
      cancellation_fee: "50.00",
      is_active: true,
    }
  },
  {
    id: 3,
    name: "bike",
    display_name: "Motorbike",
    description: "Fast and efficient single-passenger motorbikes",
    is_active: true,
    fare_config: {
      id: 3,
      vehicle_type: "bike",
      base_fare: "80.00",
      per_km_rate: "40.00",
      per_minute_rate: "5.00",
      cancellation_fee: "50.00",
      is_active: true,
    }
  },
  {
    id: 4,
    name: "suv",
    display_name: "SUV",
    description: "Large 6-seater utility and family vehicles",
    is_active: true,
    fare_config: {
      id: 4,
      vehicle_type: "suv",
      base_fare: "200.00",
      per_km_rate: "100.00",
      per_minute_rate: "5.00",
      cancellation_fee: "50.00",
      is_active: true,
    }
  }
];

const mapDBVehicleToOption = (vt: DBVehicleType, distanceMeters: number, durationSeconds: number): RideOption => {
  const iconMap: Record<string, "car" | "bicycle" | "bus"> = {
    car: "car",
    tuk: "car",
    bike: "bicycle",
    suv: "bus",
  };
  const icon = iconMap[vt.name] || "car";

  let price = 0;
  if (vt.fare_config) {
    const baseFare = parseFloat(vt.fare_config.base_fare);
    const perKmRate = parseFloat(vt.fare_config.per_km_rate);
    const perMinRate = parseFloat(vt.fare_config.per_minute_rate);
    const distanceKm = distanceMeters / 1000;
    const durationMin = durationSeconds / 60;
    price = baseFare + (distanceKm * perKmRate) + (durationMin * perMinRate);
  } else {
    const distanceKm = distanceMeters / 1000;
    price = 150 + (distanceKm * 60);
  }

  const etaMap: Record<string, string> = {
    bike: "1 min",
    tuk: "2 mins",
    car: "3 mins",
    suv: "5 mins",
  };
  const ratingMap: Record<string, number> = {
    bike: 4.5,
    tuk: 4.7,
    car: 4.8,
    suv: 4.9,
  };

  return {
    id: vt.name, // The backend expects string name in vehicle_type
    name: vt.display_name,
    icon,
    price: parseFloat(price.toFixed(2)),
    eta: etaMap[vt.name] || "4 mins",
    rating: ratingMap[vt.name] || 4.6,
  };
};

export default function SelectRideReturnScreen() {
  const router = useRouter();
  const [selectedRide, setSelectedRide] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [dbVehicles, setDbVehicles] = useState<DBVehicleType[]>([]);
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const { returnTrip, setReturnRide } = useRideSearch();

  // Fetch real directions when component loads
  useEffect(() => {
    const fetchDirections = async () => {
      if (returnTrip.pickup && returnTrip.dropoff) {
        setLoadingRoute(true);
        try {
          const result = await getCachedDirections_withCache(
            returnTrip.pickup.latitude,
            returnTrip.pickup.longitude,
            returnTrip.dropoff.latitude,
            returnTrip.dropoff.longitude,
          );
          setDirections(result);
        } catch (error) {
          console.error("Error fetching directions:", error);
        } finally {
          setLoadingRoute(false);
        }
      }
    };

    fetchDirections();
  }, [returnTrip.pickup, returnTrip.dropoff]);

  // Fetch active vehicle types from the API database
  useEffect(() => {
    const fetchVehicles = async () => {
      setLoadingVehicles(true);
      try {
        const response = await apiClient.get<DBVehicleType[]>("/vehicle-types");
        if (response.success && response.data && response.data.length > 0) {
          const active = response.data.filter(vt => vt.is_active);
          setDbVehicles(active);
        } else {
          console.warn("API returned empty vehicle list or failed, falling back to mock data.");
          setDbVehicles(MOCK_VEHICLE_TYPES);
        }
      } catch (error) {
        console.error("Error fetching vehicle types, using mock fallback:", error);
        setDbVehicles(MOCK_VEHICLE_TYPES);
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchVehicles();
  }, []);

  // Compute dyn pricing once both vehicle types and routing directions are ready
  useEffect(() => {
    if (directions && dbVehicles.length > 0) {
      const mapped = dbVehicles.map(vt => 
        mapDBVehicleToOption(vt, directions.distance, directions.duration)
      );
      setRideOptions(mapped);
      // Auto select first option if none is selected
      if (mapped.length > 0 && !selectedRide) {
        setSelectedRide(mapped[0].id);
      }
    }
  }, [directions, dbVehicles]);

  // Validate data
  if (!returnTrip.pickup || !returnTrip.dropoff) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Location data missing</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickup = returnTrip.pickup;
  const dropoff = returnTrip.dropoff;

  const handleSelectRide = (rideId: string) => {
    setSelectedRide(rideId);
  };

  const handleContinue = () => {
    if (!selectedRide || rideOptions.length === 0) return;

    setIsLoading(true);
    try {
      const selectedRideData = rideOptions.find((r) => r.id === selectedRide);
      if (selectedRideData) {
        setReturnRide(selectedRideData);
      }

      // Go to confirmation after both trips are selected
      router.push("/ride-search/confirmation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* MAP */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        {/* Blue Route Line - Using actual road route */}
        {directions && directions.polyline.length > 0 ? (
          <Polyline
            coordinates={directions.polyline}
            strokeColor="#2563EB"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        ) : (
          /* Fallback straight line if directions not loaded */
          <Polyline
            coordinates={[
              { latitude: pickup.latitude, longitude: pickup.longitude },
              { latitude: dropoff.latitude, longitude: dropoff.longitude },
            ]}
            strokeColor="#2563EB"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}

        <Marker
          coordinate={{
            latitude: pickup.latitude,
            longitude: pickup.longitude,
          }}
          title="Return From"
          pinColor="#2563EB"
        />

        <Marker
          coordinate={{
            latitude: dropoff.latitude,
            longitude: dropoff.longitude,
          }}
          title="Return To"
          pinColor="#F97316"
        />
      </MapView>

      {/* Distance Info Overlay */}
      {loadingRoute ? (
        <View style={styles.distanceOverlay}>
          <View style={styles.distanceCard}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.distanceLabel}>Loading route...</Text>
          </View>
        </View>
      ) : directions ? (
        <View style={styles.distanceOverlay}>
          <View style={styles.distanceCard}>
            <Ionicons name="navigate" size={18} color="#2563EB" />
            <View style={styles.distanceTextContainer}>
              <Text style={styles.distanceValue}>
                {directions.distanceText}
              </Text>
              <Text style={styles.distanceLabel}>
                {directions.durationText} away
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Bottom Sheet - Ride Selection */}
      <View style={styles.bottomSheet}>
        {/* Header with Close */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Choose a Ride</Text>
            <Text style={styles.subtitle}>Return Trip</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Ride Cards - Horizontal Scroll */}
        {loadingRoute || loadingVehicles ? (
          <View style={{ height: 170, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={{ marginTop: 8, color: "#6B7280", fontSize: 13, fontWeight: "500" }}>Calculating return fares...</Text>
          </View>
        ) : rideOptions.length === 0 ? (
          <View style={{ height: 170, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
            <Text style={{ marginTop: 8, color: "#EF4444", fontSize: 13, fontWeight: "500" }}>No return vehicles available</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.ridesContainer}
            contentContainerStyle={styles.ridesContent}
          >
            {rideOptions.map((ride) => (
              <TouchableOpacity
                key={ride.id}
                style={[
                  styles.rideCard,
                  selectedRide === ride.id && styles.rideCardSelected,
                ]}
                onPress={() => handleSelectRide(ride.id)}
                activeOpacity={0.7}
              >
                {/* Icon */}
                <View
                  style={[
                    styles.iconContainer,
                    selectedRide === ride.id && styles.iconContainerSelected,
                  ]}
                >
                  <Ionicons
                    name={ride.icon as any}
                    size={28}
                    color={selectedRide === ride.id ? "#fff" : "#10B981"}
                  />
                </View>

                {/* Ride Info */}
                <Text
                  style={[
                    styles.rideName,
                    selectedRide === ride.id && styles.rideNameSelected,
                  ]}
                >
                  {ride.name}
                </Text>
                <Text
                  style={[
                    styles.eta,
                    selectedRide === ride.id && styles.etaSelected,
                  ]}
                >
                  {ride.eta}
                </Text>

                {/* Distance & Duration */}
                {directions && (
                  <View style={styles.routeInfo}>
                    <Text
                      style={[
                        styles.routeDistance,
                        selectedRide === ride.id && styles.routeDistanceSelected,
                      ]}
                    >
                      {directions.distanceText}
                    </Text>
                    <Text
                      style={[
                        styles.routeDuration,
                        selectedRide === ride.id && styles.routeDurationSelected,
                      ]}
                    >
                      {directions.durationText}
                    </Text>
                  </View>
                )}

                {/* Rating */}
                <View style={styles.ratingBox}>
                  <Ionicons name="star" size={12} color="#FCD34D" />
                  <Text
                    style={[
                      styles.rating,
                      selectedRide === ride.id && { color: "#fff" },
                    ]}
                  >
                    {ride.rating}
                  </Text>
                </View>

                {/* Price */}
                <Text
                  style={[
                    styles.price,
                    selectedRide === ride.id && styles.priceSelected,
                  ]}
                >
                  LKR {ride.price.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Cash & Options */}
        <View style={styles.optionsBar}>
          <View style={styles.cashOption}>
            <Ionicons name="cash-outline" size={18} color="#6B7280" />
            <Text style={styles.optionText}>Cash</Text>
          </View>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={24} color="#10B981" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="pencil-outline" size={16} color="#10B981" />
            <Text style={styles.secondaryButtonText}>Add note</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="ticket-outline" size={16} color="#10B981" />
            <Text style={styles.secondaryButtonText}>Promo code</Text>
          </TouchableOpacity>
        </View>

        {/* Continue/Book Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedRide || isLoading || rideOptions.length === 0 ? styles.continueButtonDisabled : {},
          ]}
          onPress={handleContinue}
          disabled={!selectedRide || isLoading || rideOptions.length === 0}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Review Booking</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  map: {
    flex: 1,
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
  },

  backButton: {
    marginTop: 20,
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  backButtonText: {
    color: "#fff",
    fontWeight: "600",
  },

  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    elevation: 10,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  ridesContainer: {
    marginBottom: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },

  ridesContent: {
    gap: 12,
    paddingRight: 16,
  },

  rideCard: {
    minWidth: 110,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },

  rideCardSelected: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  iconContainerSelected: {
    backgroundColor: "#059669",
  },

  rideName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },

  rideNameSelected: {
    color: "#fff",
  },

  eta: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },

  etaSelected: {
    color: "#D1FAE5",
  },

  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 6,
  },

  rating: {
    fontSize: 11,
    color: "#6B7280",
  },

  price: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },

  priceSelected: {
    color: "#fff",
  },

  optionsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },

  cashOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  optionText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },

  addButton: {
    padding: 4,
  },

  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },

  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
  },

  secondaryButtonText: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "500",
  },

  continueButton: {
    backgroundColor: "#FBBF24",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },

  continueButtonDisabled: {
    opacity: 0.5,
  },

  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },

  distanceOverlay: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 10,
  },

  distanceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 5,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  distanceTextContainer: {
    flex: 1,
  },

  distanceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },

  distanceLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  routeInfo: {
    alignItems: "center",
    gap: 2,
    marginVertical: 6,
  },

  routeDistance: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10B981",
  },

  routeDistanceSelected: {
    color: "#fff",
  },

  routeDuration: {
    fontSize: 10,
    color: "#6B7280",
  },

  routeDurationSelected: {
    color: "rgba(255, 255, 255, 0.8)",
  },
});
