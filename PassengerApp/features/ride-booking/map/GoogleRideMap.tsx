import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Text,
  type ImageSourcePropType,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type EdgePadding,
  type LatLng,
} from "react-native-maps";
import { useSmoothLocation } from "../../../hooks/useSmoothLocation";
import { getVehicleMapIcon } from "../../../utils/vehicleMapIcons";
import VehicleMarker from "./VehicleMarker";
import type { MapCoordinate, NearbyVehicle } from "./vehicleMapTypes";

type Props = {
  pickup: MapCoordinate;
  dropoff?: MapCoordinate | null;
  driverLocation?: MapCoordinate | null;
  nearbyVehicles?: NearbyVehicle[];
  routeCoordinates?: MapCoordinate[];
  routeColor?: string;
  pickupColor?: string;
  dropoffColor?: string;
  vehicleImage?: ImageSourcePropType;
  showDriverMarker?: boolean;
  showPickupMarker?: boolean;
  dropoffLabel?: string;
  fitEdgePadding?: EdgePadding;
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
const DEFAULT_FIT_EDGE_PADDING: EdgePadding = {
  top: 120,
  right: 80,
  bottom: 120,
  left: 80,
};

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

function DropoffMarker({ color, label = "Drop" }: { color: string; label?: string }) {
  return (
    <View style={styles.dropMarkerWrap}>
      <View style={[styles.dropLabel, { borderColor: `${color}33` }]}>
        <Text style={[styles.dropLabelText, { color }]}>{label}</Text>
      </View>
      <View style={[styles.dropPin, { backgroundColor: color }]}>
        <Text style={styles.dropPinText}>D</Text>
      </View>
      <View style={[styles.dropPinTip, { borderTopColor: color }]} />
    </View>
  );
}

export default function GoogleRideMap({
  pickup,
  dropoff,
  driverLocation,
  nearbyVehicles = [],
  routeCoordinates,
  routeColor = "#20B768",
  pickupColor = "#20B768",
  dropoffColor = "#F97316",
  vehicleImage,
  showDriverMarker = true,
  showPickupMarker = true,
  dropoffLabel = "Drop",
  fitEdgePadding = DEFAULT_FIT_EDGE_PADDING,
  style,
  onMapPress,
  followVehicle = false,
  followZoom = 16,
  followPitch = 45,
  onFollowStateChange,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const hasFitInitialBounds = useRef(false);
  const markerTrackingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [vehicleMarkersReady, setVehicleMarkersReady] = useState(true);
  const { location: smoothDriverLocation } = useSmoothLocation(driverLocation);
  const renderedDriverLocation = smoothDriverLocation ?? driverLocation;
  const driverMarkerImage =
    vehicleImage || require("../../../assets/icons/car.png");
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
    setVehicleMarkersReady(true);
    if (markerTrackingTimeoutRef.current) {
      clearTimeout(markerTrackingTimeoutRef.current);
      markerTrackingTimeoutRef.current = null;
    }
  }, [driverMarkerImage, nearbyVehicles, renderedDriverLocation]);

  useEffect(() => {
    return () => {
      if (markerTrackingTimeoutRef.current) clearTimeout(markerTrackingTimeoutRef.current);
    };
  }, []);

  const handleVehicleImageReady = useCallback(() => {
    if (markerTrackingTimeoutRef.current) clearTimeout(markerTrackingTimeoutRef.current);
    markerTrackingTimeoutRef.current = setTimeout(
      () => setVehicleMarkersReady(false),
      Platform.OS === "android" ? 700 : 150,
    );
  }, []);

  useEffect(() => {
    if (followVehicle || cameraIsFree || visibleCoordinates.length < 2) return;
    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(visibleCoordinates, {
        edgePadding: fitEdgePadding,
        animated: true,
      });
      hasFitInitialBounds.current = true;
    }, hasFitInitialBounds.current ? 0 : 500);

    return () => clearTimeout(timeout);
  }, [cameraIsFree, fitEdgePadding, followVehicle, visibleCoordinates]);

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

      {showPickupMarker ? (
        <Marker coordinate={toLatLng(pickup)} anchor={{ x: 0.5, y: 0.5 }}>
          <DotMarker color={pickupColor} />
        </Marker>
      ) : null}

      {dropoff ? (
        <Marker coordinate={toLatLng(dropoff)} anchor={{ x: 0.5, y: 1 }}>
          <DropoffMarker color={dropoffColor} label={dropoffLabel} />
        </Marker>
      ) : null}

      {nearbyVehicles.map((vehicle) =>
        isValidCoordinate(vehicle.coordinate) ? (
          <Marker
            key={vehicle.id}
            coordinate={toLatLng(vehicle.coordinate)}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={vehicleMarkersReady}
          >
            <VehicleMarker
              source={getVehicleMapIcon(vehicle.vehicleType)}
              heading={vehicle.heading ?? vehicle.coordinate.heading ?? 0}
              size={42}
              onImageReady={handleVehicleImageReady}
            />
          </Marker>
        ) : null,
      )}

      {showDriverMarker && renderedDriverLocation ? (
        <Marker
          coordinate={toLatLng(renderedDriverLocation)}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={100}
          tracksViewChanges
        >
          <VehicleMarker
            source={driverMarkerImage}
            heading={renderedDriverLocation.heading ?? 0}
            size={48}
            active
          />
        </Marker>
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
  dropMarkerWrap: {
    alignItems: "center",
  },
  dropLabel: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },
  dropLabelText: {
    fontSize: 11,
    fontWeight: "900",
  },
  dropPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  dropPinText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  dropPinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -3,
  },
});





