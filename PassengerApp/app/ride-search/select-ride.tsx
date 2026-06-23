import { useLocalSearchParams, useRouter } from "expo-router";
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
import React, { useEffect, useState } from "react";
import {
  getCachedDirections_withCache,
  type DirectionsResult,
} from "../services/routing/mapboxRoutingService";
import { useRideSearch, type RideOption } from "../context/RideSearchContext";
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

export default function SelectRideScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { tripType, setOutboundRide, setOutboundPickup, setOutboundDropoff } = useRideSearch();
  
  const [selectedRide, setSelectedRide] = React.useState<string | null>(null);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [dbVehicles, setDbVehicles] = useState<DBVehicleType[]>([]);
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const pickup = JSON.parse(params.pickup as string);
  const destination = JSON.parse(params.destination as string);

  // Fetch real directions when component loads
  useEffect(() => {
    const fetchDirections = async () => {
      setLoadingRoute(true);
      try {
        const result = await getCachedDirections_withCache(
          pickup.latitude,
          pickup.longitude,
          destination.latitude,
          destination.longitude,
        );
        setDirections(result);
      } catch (error) {
        console.error("Error fetching directions:", error);
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchDirections();
  }, [pickup, destination]);

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

  const handleBookNow = () => {
    if (!selectedRide || rideOptions.length === 0) return;

    const selectedRideOption = rideOptions.find((r) => r.id === selectedRide);
    if (!selectedRideOption) return;

    // Save outbound trip details to centralized context
    setOutboundPickup(pickup);
    setOutboundDropoff(destination);
    setOutboundRide(selectedRideOption);

    if (tripType === "return") {
      router.push({
        pathname: "/ride-search/return-trip-location",
      });
    } else {
      router.push("/ride-search/confirmation");
    }
  };

  return (
    <View style={styles.container}>
      {/* MapView */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
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
              {
                latitude: destination.latitude,
                longitude: destination.longitude,
              },
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
          title="Pickup"
          pinColor="#2563EB"
        />

        <Marker
          coordinate={{
            latitude: destination.latitude,
            longitude: destination.longitude,
          }}
          title="Drop"
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
          <Text style={styles.title}>Choose a Ride</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Ride Cards - Horizontal Scroll */}
        {loadingRoute || loadingVehicles ? (
          <View style={{ height: 170, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#0B7BDC" />
            <Text style={{ marginTop: 8, color: "#6B7280", fontSize: 13, fontWeight: "500" }}>Calculating fares...</Text>
          </View>
        ) : rideOptions.length === 0 ? (
          <View style={{ height: 170, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
            <Text style={{ marginTop: 8, color: "#EF4444", fontSize: 13, fontWeight: "500" }}>No vehicles available</Text>
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
                onPress={() => setSelectedRide(ride.id)}
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
                    color={selectedRide === ride.id ? "#fff" : "#0B7BDC"}
                  />
                </View>

                {/* Ride Info */}
                <Text
                  style={[
                    styles.rideName,
                    selectedRide === ride.id && { color: "#fff" },
                  ]}
                >
                  {ride.name}
                </Text>
                <Text
                  style={[
                    styles.eta,
                    selectedRide === ride.id && { color: "#D1FAE5" },
                  ]}
                >
                  {ride.eta}
                </Text>

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
                    selectedRide === ride.id && { color: "#fff" },
                  ]}
                >
                  LKR {ride.price.toFixed(2)}
                </Text>

                {/* Distance & Duration */}
                {directions && (
                  <View style={styles.routeInfo}>
                    <Text
                      style={[
                        styles.routeDistance,
                        selectedRide === ride.id && { color: "#fff" },
                      ]}
                    >
                      {directions.distanceText}
                    </Text>
                    <Text
                      style={[
                        styles.routeDuration,
                        selectedRide === ride.id && { color: "rgba(255, 255, 255, 0.8)" },
                      ]}
                    >
                      {directions.durationText}
                    </Text>
                  </View>
                )}
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
          <TouchableOpacity>
            <Ionicons name="add-circle-outline" size={24} color="#0B7BDC" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="pencil" size={16} color="#000" />
            <Text style={styles.secondaryText}>Add note</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.promoButton}>
            <Ionicons name="ticket" size={16} color="#0B7BDC" />
            <Text style={styles.promoText}>Add Promo</Text>
          </TouchableOpacity>
        </View>

        {/* Book Button */}
        <TouchableOpacity
          style={[
            styles.bookButton,
            !selectedRide && styles.bookButtonDisabled,
          ]}
          onPress={handleBookNow}
          disabled={!selectedRide}
        >
          <Text style={styles.bookText}>
            {tripType === "return" ? "Continue to Return" : "Book Now"}
          </Text>
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
    alignItems: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
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
    backgroundColor: "#0B7BDC",
    borderColor: "#0B7BDC",
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  iconContainerSelected: {
    backgroundColor: "#1E40AF",
  },

  rideName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },

  eta: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
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

  secondaryText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },

  promoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: "#F0F7FF",
    borderRadius: 12,
  },

  promoText: {
    fontSize: 13,
    color: "#0B7BDC",
    fontWeight: "500",
  },

  bookButton: {
    backgroundColor: "#FBBF24",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },

  bookButtonDisabled: {
    opacity: 0.5,
  },

  bookText: {
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
    color: "#2563EB",
  },

  routeDuration: {
    fontSize: 10,
    color: "#6B7280",
  },
});
