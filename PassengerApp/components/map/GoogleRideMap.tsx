import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ImageSourcePropType,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
} from "react-native-maps";
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
  vehicleImage?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  onMapPress?: (event: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => void;
  followVehicle?: boolean;
  followZoom?: number;
  followPitch?: number;
  onFollowStateChange?: (following: boolean) => void;
};

const CAMERA_UPDATE_INTERVAL_MS = 250;
const FOLLOW_CAMERA_ANIMATION_MS = 350;
const DEFAULT_DELTA = 0.04;

const isValidCoordinate = (
  coordinate?: MapCoordinate | null,
): coordinate is MapCoordinate =>
  Number.isFinite(coordinate?.latitude) &&
  Number.isFinite(coordinate?.longitude);

const toLatLng = (coordinate: MapCoordinate): LatLng => ({
  latitude: coordinate.latitude,
  longitude: coordinate.longitude,
});

const useFollowCameraLocation = (
  location: MapCoordinate | null | undefined,
  enabled: boolean,
) => {
  const [cameraLocation, setCameraLocation] = useState(location);
  const lastUpdateRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestLocationRef = useRef(location);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !location) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      latestLocationRef.current = location;
      setCameraLocation(location);
      return;
    }

    latestLocationRef.current = location;
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;
    const publish = () => {
      lastUpdateRef.current = Date.now();
      timeoutRef.current = null;
      setCameraLocation(latestLocationRef.current);
    };

    if (elapsed >= CAMERA_UPDATE_INTERVAL_MS) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      publish();
      return;
    }

    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(
        publish,
        CAMERA_UPDATE_INTERVAL_MS - elapsed,
      );
    }
  }, [enabled, location]);

  return cameraLocation;
};

function DotMarker({ color }: { color: string }) {
  return (
    <View style={[styles.dotOuter, { backgroundColor: `${color}33` }]}>
      <View style={[styles.dotInner, { backgroundColor: color }]} />
    </View>
  );
}

export default function GoogleRideMap({
  pickup,
  dropoff,
  driverLocation,
  routeCoordinates,
  routeColor = "#0B7BDC",
  pickupColor = "#0B7BDC",
  dropoffColor = "#F97316",
  vehicleImage,
  style,
  onMapPress,
  followVehicle = false,
  followZoom = 16,
  followPitch = 45,
  onFollowStateChange,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const hasFitInitialBounds = useRef(false);
  const { location: smoothDriverLocation } = useSmoothLocation(driverLocation);
  const renderedDriverLocation = smoothDriverLocation ?? driverLocation;
  const driverMarkerImage =
    vehicleImage || require("../../assets/icons/map/car.png");
  const driverMarkerHeading = followVehicle
    ? 0
    : (renderedDriverLocation?.heading ?? 0);
  const driverMarkerRotation = driverMarkerHeading - 90;
  const cameraDriverLocation = useFollowCameraLocation(
    renderedDriverLocation,
    followVehicle,
  );
  const cameraIsFree = Boolean(onFollowStateChange) && !followVehicle;
  const visibleCoordinates = useMemo(
    () =>
      [pickup, dropoff, renderedDriverLocation, ...(routeCoordinates || [])]
        .filter(isValidCoordinate)
        .map(toLatLng),
    [pickup, dropoff, renderedDriverLocation, routeCoordinates],
  );
  const routeLine = useMemo(() => {
    if (routeCoordinates && routeCoordinates.length > 1) {
      return routeCoordinates.filter(isValidCoordinate).map(toLatLng);
    }
    if (dropoff) return [pickup, dropoff].filter(isValidCoordinate).map(toLatLng);
    return [];
  }, [dropoff, pickup, routeCoordinates]);

  useEffect(() => {
    if (followVehicle || cameraIsFree || visibleCoordinates.length < 2) return;
    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(visibleCoordinates, {
        edgePadding: { top: 120, right: 80, bottom: 120, left: 80 },
        animated: true,
      });
      hasFitInitialBounds.current = true;
    }, hasFitInitialBounds.current ? 0 : 500);

    return () => clearTimeout(timeout);
  }, [cameraIsFree, followVehicle, visibleCoordinates]);

  useEffect(() => {
    const next = cameraDriverLocation ?? renderedDriverLocation;
    if (!followVehicle || !next) return;

    mapRef.current?.animateCamera(
      {
        center: toLatLng(next),
        heading: next.heading ?? 0,
        pitch: followPitch,
        zoom: followZoom,
      },
      { duration: FOLLOW_CAMERA_ANIMATION_MS },
    );
  }, [cameraDriverLocation, followPitch, followVehicle, followZoom, renderedDriverLocation]);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={[styles.map, style]}
      initialRegion={{
        latitude: pickup.latitude,
        longitude: pickup.longitude,
        latitudeDelta: DEFAULT_DELTA,
        longitudeDelta: DEFAULT_DELTA,
      }}
      showsCompass={false}
      showsMyLocationButton={false}
      onPress={onMapPress}
      onPanDrag={() => {
        if (followVehicle) onFollowStateChange?.(false);
      }}
    >
      {routeLine.length > 1 ? (
        <Polyline
          coordinates={routeLine}
          strokeColor={routeColor}
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />
      ) : null}

      <Marker coordinate={toLatLng(pickup)} anchor={{ x: 0.5, y: 0.5 }}>
        <DotMarker color={pickupColor} />
      </Marker>

      {dropoff ? (
        <Marker coordinate={toLatLng(dropoff)} anchor={{ x: 0.5, y: 0.5 }}>
          <DotMarker color={dropoffColor} />
        </Marker>
      ) : null}

      {renderedDriverLocation ? (
        <Marker
          coordinate={toLatLng(renderedDriverLocation)}
          anchor={{ x: 0.5, y: 0.5 }}
          image={driverMarkerImage as any}
          rotation={driverMarkerRotation}
          flat
          tracksViewChanges={false}
        />
      ) : null}
    </MapView>
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
});
