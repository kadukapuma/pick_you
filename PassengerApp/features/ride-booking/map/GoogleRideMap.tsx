import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Text,
  type ImageSourcePropType,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { PASSENGER_LIGHT_MAP_STYLE } from "./rideMapStyle";

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
  pickupLabel?: string;
  dropoffLabel?: string;
  includePickupInFocus?: boolean;
  fitEdgePadding?: EdgePadding;
  style?: StyleProp<ViewStyle>;
  onMapPress?: (event: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => void;
  followVehicle?: boolean;
  followZoom?: number;
  followPitch?: number;
  initialPitch?: number;
  onFollowStateChange?: (following: boolean) => void;
  showFocusControls?: boolean;
  focusControlsTop?: number;
};

const CAMERA_UPDATE_INTERVAL_MS = 1000;
const FOLLOW_CAMERA_ANIMATION_MS = 700;
const CAMERA_MIN_MOVE_METERS = 6;
const DEFAULT_FIT_EDGE_PADDING: EdgePadding = {
  top: 120,
  right: 80,
  bottom: 120,
  left: 80,
};

const isValidCoordinate = (
  coordinate?: any,
): coordinate is MapCoordinate =>
  Number.isFinite(Number(coordinate?.latitude ?? coordinate?.lat)) &&
  Number.isFinite(Number(coordinate?.longitude ?? coordinate?.lng));

const toLatLng = (coordinate: any): LatLng => ({
  latitude: Number(coordinate?.latitude ?? coordinate?.lat ?? 0),
  longitude: Number(coordinate?.longitude ?? coordinate?.lng ?? 0),
});

const distanceMeters = (from?: any, to?: any) => {
  if (!isValidCoordinate(from) || !isValidCoordinate(to)) return Infinity;

  const start = toLatLng(from);
  const end = toLatLng(to);
  const latScale = 111320;
  const lngScale =
    latScale * Math.cos(((start.latitude + end.latitude) / 2) * Math.PI / 180);

  return Math.hypot(
    (end.latitude - start.latitude) * latScale,
    (end.longitude - start.longitude) * lngScale,
  );
};

const useFollowCameraLocation = (
  location: MapCoordinate | null | undefined,
  enabled: boolean,
) => {
  const [cameraLocation, setCameraLocation] = useState(location);
  const lastUpdateRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestLocationRef = useRef(location);
  const cameraLocationRef = useRef(location);

  const updateCameraLocation = useCallback((nextLocation: typeof location) => {
    const previous = cameraLocationRef.current;
    if (
      previous === nextLocation ||
      (previous &&
        nextLocation &&
        distanceMeters(previous, nextLocation) < CAMERA_MIN_MOVE_METERS)
    ) {
      return;
    }

    cameraLocationRef.current = nextLocation;
    setCameraLocation(nextLocation);
  }, []);

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
      updateCameraLocation(location);
      return;
    }

    latestLocationRef.current = location;
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;
    const publish = () => {
      lastUpdateRef.current = Date.now();
      timeoutRef.current = null;
      updateCameraLocation(latestLocationRef.current);
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
  }, [enabled, location, updateCameraLocation]);

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
  pickupLabel,
  dropoffLabel = "Drop",
  includePickupInFocus = true,
  fitEdgePadding = DEFAULT_FIT_EDGE_PADDING,
  style,
  onMapPress,
  followVehicle = false,
  followZoom = 16,
  onFollowStateChange,
  showFocusControls = false,
  focusControlsTop = 170,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const hasFitInitialBounds = useRef(false);
  const lastAnimatedCameraRef = useRef<LatLng | null>(null);
  const markerTrackingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [vehicleMarkersReady, setVehicleMarkersReady] = useState(true);
  const [hasUserMovedMap, setHasUserMovedMap] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const { location: smoothDriverLocation } = useSmoothLocation(driverLocation);
  const renderedDriverLocation = useMemo(
    () => smoothDriverLocation ?? driverLocation,
    [smoothDriverLocation, driverLocation],
  );
  const displayedNearbyVehicle = useMemo(
    () =>
      nearbyVehicles.find((vehicle) =>
        isValidCoordinate(vehicle.coordinate),
      ),
    [nearbyVehicles],
  );
  const vehicleLocationForCamera = useMemo(() => {
    if (!showDriverMarker && displayedNearbyVehicle) {
      if (isValidCoordinate(renderedDriverLocation)) {
        return renderedDriverLocation;
      }
      return {
        ...displayedNearbyVehicle.coordinate,
        heading:
          displayedNearbyVehicle.heading ??
          displayedNearbyVehicle.coordinate.heading ??
          0,
      };
    }
    return renderedDriverLocation;
  }, [displayedNearbyVehicle, renderedDriverLocation, showDriverMarker]);
  const driverMarkerImage =
    vehicleImage || require("../../../assets/icons/car.png");
  const cameraDriverLocation = useFollowCameraLocation(
    vehicleLocationForCamera,
    followVehicle,
  );
  const pickupLat = pickup?.latitude;
  const pickupLng = pickup?.longitude;
  const dropoffLat = dropoff?.latitude;
  const dropoffLng = dropoff?.longitude;
  const vehicleLat = vehicleLocationForCamera?.latitude;
  const vehicleLng = vehicleLocationForCamera?.longitude;
  const routeCoordinatesLength = routeCoordinates?.length ?? 0;
  const nearbyVehiclesLength = nearbyVehicles.length;
  const visibleCoordinates = useMemo(
    () =>
      [
        showPickupMarker && includePickupInFocus ? pickup : null,
        dropoff,
        vehicleLocationForCamera,
        ...nearbyVehicles.map((vehicle) => vehicle.coordinate),
        ...(routeCoordinates || []),
      ]
        .filter(isValidCoordinate)
        .map(toLatLng),
    [
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      includePickupInFocus,
      nearbyVehiclesLength,
      routeCoordinatesLength,
      showPickupMarker,
      vehicleLat,
      vehicleLng,
    ],
  );
  const routeLine = useMemo(() => {
    if (routeCoordinates && routeCoordinates.length > 1) {
      return routeCoordinates.filter(isValidCoordinate).map(toLatLng);
    }
    if (dropoff) return [pickup, dropoff].filter(isValidCoordinate).map(toLatLng);
    return [];
  }, [dropoff, pickup, routeCoordinates]);
  const focusVehicleCoordinate = useMemo(
    () =>
      isValidCoordinate(vehicleLocationForCamera)
        ? vehicleLocationForCamera
        : undefined,
    [vehicleLocationForCamera],
  );
  const routeFocusCoordinates = useMemo(
    () =>
      [
        focusVehicleCoordinate,
        ...routeLine,
        dropoff,
        showPickupMarker && includePickupInFocus ? pickup : null,
      ]
        .filter(isValidCoordinate)
        .map(toLatLng),
    [
      dropoff,
      focusVehicleCoordinate,
      includePickupInFocus,
      pickup,
      routeLine,
      showPickupMarker,
    ],
  );

  useEffect(() => {
    setVehicleMarkersReady(true);
    if (markerTrackingTimeoutRef.current) {
      clearTimeout(markerTrackingTimeoutRef.current);
      markerTrackingTimeoutRef.current = null;
    }
  }, [driverMarkerImage]);

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

  const focusVehicle = useCallback(() => {
    if (!focusVehicleCoordinate) return;
    setHasUserMovedMap(false);
    onFollowStateChange?.(true);
    mapRef.current?.animateCamera(
      {
        center: toLatLng(focusVehicleCoordinate),
        heading: 0,
        pitch: 0,
        zoom: followZoom,
      },
      { duration: 600 },
    );
  }, [
    focusVehicleCoordinate,
    followZoom,
    onFollowStateChange,
  ]);

  const focusFullRoute = useCallback(() => {
    if (routeFocusCoordinates.length < 2) return;
    setHasUserMovedMap(true);
    onFollowStateChange?.(false);
    mapRef.current?.fitToCoordinates(routeFocusCoordinates, {
      edgePadding: fitEdgePadding,
      animated: true,
    });
    setTimeout(() => {
      mapRef.current?.animateCamera(
        {
          heading: 0,
          pitch: 0,
        },
        { duration: 380 },
      );
    }, 430);
  }, [
    fitEdgePadding,
    onFollowStateChange,
    routeFocusCoordinates,
  ]);

  useEffect(() => {
    if (
      followVehicle ||
      hasUserMovedMap ||
      !isMapReady ||
      visibleCoordinates.length < 2 ||
      hasFitInitialBounds.current
    ) return;
    let pitchTimeout: ReturnType<typeof setTimeout> | null = null;
    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(visibleCoordinates, {
        edgePadding: fitEdgePadding,
        animated: true,
      });
      pitchTimeout = setTimeout(() => {
        mapRef.current?.animateCamera(
          { pitch: 0, heading: 0 },
          { duration: 320 },
        );
      }, 220);
      hasFitInitialBounds.current = true;
    }, 120);

    return () => {
      clearTimeout(timeout);
      if (pitchTimeout) clearTimeout(pitchTimeout);
    };
  }, [fitEdgePadding, followVehicle, hasUserMovedMap, isMapReady, visibleCoordinates]);

  useEffect(() => {
    const next = cameraDriverLocation ?? vehicleLocationForCamera;
    if (!followVehicle || !next) return;

    const center = toLatLng(next);
    if (
      lastAnimatedCameraRef.current &&
      distanceMeters(lastAnimatedCameraRef.current, center) < CAMERA_MIN_MOVE_METERS
    ) {
      return;
    }
    lastAnimatedCameraRef.current = center;

    mapRef.current?.animateCamera(
      {
        center,
        heading: 0,
        pitch: 0,
        zoom: followZoom,
      },
      { duration: FOLLOW_CAMERA_ANIMATION_MS },
    );
  }, [cameraDriverLocation, followVehicle, followZoom, vehicleLocationForCamera]);

  const canShowFocusControls =
    showFocusControls &&
    Boolean(focusVehicleCoordinate) &&
    routeFocusCoordinates.length > 1;

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialCamera={{
          center: toLatLng(focusVehicleCoordinate || pickup),
          pitch: 0,
          heading: 0,
          altitude: 1200,
          zoom: 14.5,
        }}
        showsCompass={false}
        showsMyLocationButton={false}
        showsBuildings
        pitchEnabled={false}
        rotateEnabled={false}
        userInterfaceStyle="light"
        customMapStyle={PASSENGER_LIGHT_MAP_STYLE}
        onMapReady={() => setIsMapReady(true)}
        onPress={onMapPress}
        onPanDrag={() => {
          setHasUserMovedMap(true);
          if (followVehicle) onFollowStateChange?.(false);
        }}
      >
        {routeLine.length > 1 ? (
          <Polyline
            coordinates={routeLine}
            strokeColor={routeColor}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}

        {showPickupMarker ? (
          <Marker
            coordinate={toLatLng(pickup)}
            anchor={{ x: 0.5, y: pickupLabel ? 1 : 0.5 }}
          >
            {pickupLabel ? (
              <PickupMarker color={pickupColor} label={pickupLabel} />
            ) : (
              <DotMarker color={pickupColor} />
            )}
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
              coordinate={toLatLng(
                vehicle.id === displayedNearbyVehicle?.id &&
                  isValidCoordinate(vehicleLocationForCamera)
                  ? vehicleLocationForCamera
                  : vehicle.coordinate,
              )}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={50}
              tracksViewChanges={vehicleMarkersReady}
            >
              <VehicleMarker
                source={getVehicleMapIcon(vehicle.vehicleType)}
                heading={
                  vehicle.id === displayedNearbyVehicle?.id
                    ? vehicleLocationForCamera?.heading ??
                    vehicle.heading ??
                    vehicle.coordinate.heading ??
                    0
                    : vehicle.heading ?? vehicle.coordinate.heading ?? 0
                }
                size={
                  showFocusControls && vehicle.id === displayedNearbyVehicle?.id
                    ? 46
                    : 38
                }
                active={showFocusControls && vehicle.id === displayedNearbyVehicle?.id}
                fixedForward={
                  followVehicle && vehicle.id === displayedNearbyVehicle?.id
                }
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
              size={showFocusControls ? 46 : 40}
              active
              fixedForward={followVehicle}
            />
          </Marker>
        ) : null}
      </MapView>

      {canShowFocusControls ? (
        <View
          pointerEvents="box-none"
          style={[styles.focusControlsPosition, { top: focusControlsTop }]}
        >
          <View style={styles.focusControls}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Focus driver vehicle"
              activeOpacity={0.78}
              onPress={focusVehicle}
              style={[
                styles.focusButton,
                followVehicle && styles.focusButtonActive,
              ]}
            >
              <Ionicons
                name="car-sport-outline"
                size={21}
                color={followVehicle ? "#FFFFFF" : "#0B3D2E"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Show full remaining route"
              activeOpacity={0.78}
              onPress={focusFullRoute}
              style={styles.focusButton}
            >
              <Ionicons name="map-outline" size={21} color="#0B3D2E" />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PickupMarker({ color, label = "Pickup" }: { color: string; label?: string }) {
  return (
    <View style={styles.dropMarkerWrap}>
      <View style={[styles.dropLabel, { borderColor: `${color}33` }]}>
        <Text style={[styles.dropLabelText, { color }]}>{label}</Text>
      </View>
      <View style={[styles.dropPin, { backgroundColor: color }]}>
        <Text style={styles.dropPinText}>P</Text>
      </View>
      <View style={[styles.dropPinTip, { borderTopColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  focusControlsPosition: {
    position: "absolute",
    right: 14,
    zIndex: 20,
  },
  focusControls: {
    width: 46,
    gap: 10,
  },
  focusButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.09)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 7,
  },
  focusButtonActive: {
    backgroundColor: "#159A5B",
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





