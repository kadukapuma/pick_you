import MapboxGL from "@rnmapbox/maps";
import { Image, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_API_KEY || "";

if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
}

const toPosition = (coordinate) => [coordinate.longitude, coordinate.latitude];

const isValidCoordinate = (coordinate) =>
  Number.isFinite(coordinate?.latitude) && Number.isFinite(coordinate?.longitude);

const buildLineFeature = (coordinates) => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: coordinates.map(toPosition),
  },
});

const buildBounds = (coordinates, edgePadding) => {
  const valid = coordinates.filter(isValidCoordinate);
  if (valid.length < 2) return null;

  const lats = valid.map((coordinate) => coordinate.latitude);
  const lngs = valid.map((coordinate) => coordinate.longitude);

  const maxLat = Math.max(...lats);
  const minLat = Math.min(...lats);
  const maxLng = Math.max(...lngs);
  const minLng = Math.min(...lngs);

  // Balanced optimization: if locations are identical or too close, bypass bounds 
  // to avoid infinite tight/extreme zooming (Uber & PickMe approach)
  if (Math.abs(maxLat - minLat) < 0.0002 && Math.abs(maxLng - minLng) < 0.0002) {
    return null;
  }

  return {
    ne: [maxLng, maxLat],
    sw: [minLng, minLat],
    paddingTop: edgePadding?.top ?? 140,
    paddingRight: edgePadding?.right ?? 70,
    paddingBottom: edgePadding?.bottom ?? 260,
    paddingLeft: edgePadding?.left ?? 70,
  };
};

function DotMarker({ color = "#00A859" }) {
  return (
    <View style={[styles.dotOuter, { backgroundColor: `${color}33` }]}>
      <View style={[styles.dotInner, { backgroundColor: color }]} />
    </View>
  );
}

function VehicleMarker({ source, heading = 0, size = 76 }) {
  if (source) {
    return (
      <View style={[styles.vehicleImageFrame, { width: size, height: size }]}>
        <Image
          source={source}
          style={[
            styles.vehicleImage,
            {
              width: size,
              height: size,
              transform: [{ rotate: `${heading}deg` }],
            },
          ]}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={[styles.navigationMarker, { transform: [{ rotate: `${heading}deg` }] }]}>
      <MaterialCommunityIcons name="navigation" size={20} color="#FFFFFF" />
    </View>
  );
}

export default function MapboxRideMap({
  origin,
  destination,
  routeCoordinates = [],
  routeColor = "#00A859",
  destinationColor = "#00A859",
  vehicleImage,
  vehicleHeading = 0,
  vehicleSize = 10,
  edgePadding,
  style,
  cameraRef, // Handled target reference passing flawlessly
}) {
  const visibleCoordinates = useMemo(
    () => [origin, destination, ...routeCoordinates].filter(isValidCoordinate),
    [origin, destination, routeCoordinates],
  );

  const routeShape = useMemo(() => {
    const lineCoordinates =
      routeCoordinates.length > 1
        ? routeCoordinates
        : destination
          ? [origin, destination]
          : [];

    return lineCoordinates.length > 1 ? buildLineFeature(lineCoordinates) : null;
  }, [destination, origin, routeCoordinates]);

  const bounds = useMemo(
    () => buildBounds(visibleCoordinates, edgePadding),
    [visibleCoordinates, edgePadding],
  );

  return (
    <MapboxGL.MapView
      style={[styles.map, style]}
      styleURL={MapboxGL.StyleURL.Street}
      logoEnabled={false}
      attributionEnabled={false}
      compassEnabled={false}
    >
      <MapboxGL.Camera
        ref={cameraRef}
        bounds={bounds || undefined}
        centerCoordinate={!bounds ? toPosition(origin) : undefined}
        zoomLevel={!bounds ? 15 : undefined} // Clean balanced fallback zoom mirroring high-end dispatch maps
        animationDuration={500}
      />

      {routeShape ? (
        <MapboxGL.ShapeSource id="driver-route-source" shape={routeShape}>
          <MapboxGL.LineLayer
            id="driver-route-line"
            style={{
              lineColor: routeColor,
              lineWidth: 5,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </MapboxGL.ShapeSource>
      ) : null}

      <MapboxGL.MarkerView coordinate={toPosition(origin)}>
        <VehicleMarker
          source={vehicleImage}
          heading={vehicleHeading}
          size={vehicleSize}
        />
      </MapboxGL.MarkerView>

      {destination ? (
        <MapboxGL.MarkerView coordinate={toPosition(destination)}>
          <DotMarker color={destinationColor} />
        </MapboxGL.MarkerView>
      ) : null}
    </MapboxGL.MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  dotOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  dotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  vehicleImageFrame: {
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleImage: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  navigationMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2F80ED",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});