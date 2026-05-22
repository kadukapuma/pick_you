import MapView, { Marker, Polyline } from "react-native-maps";
import { StyleSheet } from "react-native";

type Props = {
  location: any;
  destination: any;
  onMapPress: (event: any) => void;
};

export default function RideMap({ location, destination, onMapPress }: Props) {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      onPress={onMapPress}
    >
      {/* Current Location */}
      <Marker
        coordinate={{
          latitude: location.latitude,
          longitude: location.longitude,
        }}
        title="You"
      />

      {/* Destination Marker */}
      {destination && (
        <Marker coordinate={destination} title="Destination" pinColor="green" />
      )}

      {/* Route Line */}
      {destination && (
        <Polyline
          coordinates={[
            {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            destination,
          ]}
          strokeWidth={4}
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
