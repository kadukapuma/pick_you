import MapView, { Marker, Polyline } from "react-native-maps";
import { StyleSheet, View, Image } from "react-native";
import { useRef, useEffect } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  location: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number } | null;
  driverLocation?: { latitude: number; longitude: number; heading?: number } | null;
  onMapPress?: (event: any) => void;
};

export default function RideMap({ location, destination, driverLocation, onMapPress }: Props) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const coords = [];
    if (location) coords.push(location);
    if (destination) coords.push(destination);
    if (driverLocation) coords.push(driverLocation);

    if (coords.length > 1) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
    }
  }, [location, destination, driverLocation]);

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      onPress={onMapPress}
      showsUserLocation={false}
      showsCompass={false}
      showsPointsOfInterest={false}
    >
      {/* Current Location (Passenger Pickup) */}
      <Marker
        coordinate={location}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={styles.pickupMarkerOuter}>
          <View style={styles.pickupMarkerInner} />
        </View>
      </Marker>

      {/* Driver Marker */}
      {driverLocation && (
        <Marker
          coordinate={driverLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          rotation={driverLocation.heading || 0}
        >
          <View style={styles.driverMarkerContainer}>
            <MaterialCommunityIcons name="car-sports" size={30} color="#00A859" />
          </View>
        </Marker>
      )}

      {/* Destination Marker */}
      {destination && (
        <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.destMarkerOuter}>
            <View style={styles.destMarkerInner} />
          </View>
        </Marker>
      )}

      {/* Route Line */}
      {destination && (
        <Polyline
          coordinates={[location, destination]}
          strokeWidth={4}
          strokeColor="#0B7BDC"
          lineDashPattern={[0]}
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  pickupMarkerOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(11, 123, 220, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickupMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0B7BDC",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  destMarkerOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(249, 115, 22, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  destMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F97316",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  driverMarkerContainer: {
    width: 40,
    height: 40,
    backgroundColor: "white",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
