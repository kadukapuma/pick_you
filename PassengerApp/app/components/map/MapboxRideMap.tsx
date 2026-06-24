import MapboxGL from "@rnmapbox/maps";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useMemo } from "react";
import { useSmoothLocation } from "../../hooks/useSmoothLocation";

export type MapCoordinate = {
  latitude: number;
  longitude: number;
  heading?: number;
};

type Props = {
  pickup: MapCoordinate;
  dropoff?: MapCoordinate | null;
  driverLocation?: MapCoordinate | null;
  routeCoordinates?: MapCoordinate[];
  routeColor?: string;
  pickupColor?: string;
  dropoffColor?: string;
  style?: StyleProp<ViewStyle>;
  onMapPress?: (event: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => void;
  followVehicle?: boolean;
  followZoom?: number;
  followPitch?: number;
  onFollowStateChange?: (following: boolean) => void;
};

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_API_KEY || "";

if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
}

const toPosition = (coordinate: MapCoordinate): [number, number] => [
  coordinate.longitude,
  coordinate.latitude,
];

const isValidCoordinate = (
  coordinate?: MapCoordinate | null,
): coordinate is MapCoordinate =>
  Number.isFinite(coordinate?.latitude) && Number.isFinite(coordinate?.longitude);

const buildLineFeature = (coordinates: MapCoordinate[]) => ({
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "LineString" as const,
    coordinates: coordinates.map(toPosition),
  },
});

const buildBounds = (coordinates: MapCoordinate[]) => {
  const valid = coordinates.filter(isValidCoordinate);
  if (valid.length < 2) return null;

  const lats = valid.map((coordinate) => coordinate.latitude);
  const lngs = valid.map((coordinate) => coordinate.longitude);

  return {
    ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
    sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
    paddingTop: 120,
    paddingRight: 80,
    paddingBottom: 120,
    paddingLeft: 80,
  };
};

function DotMarker({ color }: { color: string }) {
  return (
    <View style={[styles.dotOuter, { backgroundColor: `${color}33` }]}>
      <View style={[styles.dotInner, { backgroundColor: color }]} />
    </View>
  );
}

function DriverMarker({ heading = 0 }: { heading?: number }) {
  return (
    <View style={styles.driverMarker}>
      <Image
        source={require("../../../assets/images/vehicles/car3d.png")}
        style={[styles.driverVehicleImage, { transform: [{ rotate: `${heading - 90}deg` }] }]}
        resizeMode="contain"
      />
    </View>
  );
}

export default function MapboxRideMap({
  pickup,
  dropoff,
  driverLocation,
  routeCoordinates,
  routeColor = "#0B7BDC",
  pickupColor = "#0B7BDC",
  dropoffColor = "#F97316",
  style,
  onMapPress,
  followVehicle = false,
  followZoom = 16,
  followPitch = 45,
  onFollowStateChange,
}: Props) {
  const { location: smoothDriverLocation } = useSmoothLocation(driverLocation);
  const renderedDriverLocation = smoothDriverLocation ?? driverLocation;
  const cameraIsFree = Boolean(onFollowStateChange) && !followVehicle;
  const visibleCoordinates = useMemo(
    () =>
      [pickup, dropoff, driverLocation, ...(routeCoordinates || [])].filter(
        isValidCoordinate,
      ),
    [pickup, dropoff, driverLocation, routeCoordinates],
  );

  const routeShape = useMemo(() => {
    const lineCoordinates =
      routeCoordinates && routeCoordinates.length > 1
        ? routeCoordinates
        : dropoff
          ? [pickup, dropoff]
          : [];

    return lineCoordinates.length > 1 ? buildLineFeature(lineCoordinates) : null;
  }, [dropoff, pickup, routeCoordinates]);
  const bounds = useMemo(() => buildBounds(visibleCoordinates), [visibleCoordinates]);

  const handlePress = (feature: GeoJSON.Feature) => {
    const coordinates = feature.geometry?.type === "Point" ? feature.geometry.coordinates : null;
    if (!coordinates || !onMapPress) return;

    onMapPress({
      nativeEvent: {
        coordinate: {
          latitude: coordinates[1],
          longitude: coordinates[0],
        },
      },
    });
  };

  return (
    <MapboxGL.MapView
      style={[styles.map, style]}
      styleURL={MapboxGL.StyleURL.Street}
      logoEnabled={false}
      attributionEnabled={false}
      compassEnabled={false}
      onPress={handlePress}
      onTouchStart={() => {
        if (followVehicle) onFollowStateChange?.(false);
      }}
    >
      <MapboxGL.Camera
        bounds={!followVehicle && !cameraIsFree ? bounds || undefined : undefined}
        centerCoordinate={
          followVehicle && renderedDriverLocation
            ? toPosition(renderedDriverLocation)
            : !cameraIsFree && !bounds
              ? toPosition(pickup)
              : undefined
        }
        zoomLevel={followVehicle ? followZoom : !cameraIsFree && !bounds ? 14 : undefined}
        pitch={followVehicle ? followPitch : cameraIsFree ? undefined : 0}
        heading={followVehicle ? renderedDriverLocation?.heading ?? 0 : cameraIsFree ? undefined : 0}
        animationDuration={followVehicle ? 0 : 500}
      />

      {routeShape ? (
        <MapboxGL.ShapeSource id="route-source" shape={routeShape}>
          <MapboxGL.LineLayer
            id="route-line"
            style={{
              lineColor: routeColor,
              lineWidth: 4,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </MapboxGL.ShapeSource>
      ) : null}

      <MapboxGL.MarkerView coordinate={toPosition(pickup)}>
        <DotMarker color={pickupColor} />
      </MapboxGL.MarkerView>

      {dropoff ? (
        <MapboxGL.MarkerView coordinate={toPosition(dropoff)}>
          <DotMarker color={dropoffColor} />
        </MapboxGL.MarkerView>
      ) : null}

      {renderedDriverLocation ? (
        <MapboxGL.MarkerView coordinate={toPosition(renderedDriverLocation)}>
          <DriverMarker heading={renderedDriverLocation.heading} />
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
  driverMarker: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  driverVehicleImage: {
    width: 60,
    height: 60,
  },
});
