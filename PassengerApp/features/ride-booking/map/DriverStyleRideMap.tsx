import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
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
import VehicleMarker from "./VehicleMarker";
import type { MapCoordinate } from "./vehicleMapTypes";
import { PASSENGER_LIGHT_MAP_STYLE } from "./rideMapStyle";

type TargetKind = "pickup" | "dropoff" | "destination" | "pickup_drop";

type Props = {
  vehicleLocation?: MapCoordinate | null;
  target: MapCoordinate;
  targetKind: TargetKind;
  tripStart?: MapCoordinate | null;
  includeTripStartInFocus?: boolean;
  routeCoordinates?: MapCoordinate[];
  routeColor?: string;
  vehicleImage?: ImageSourcePropType;
  followVehicle?: boolean;
  followZoom?: number;
  followPitch?: number;
  followLookAheadMeters?: number;
  onFollowStateChange?: (following: boolean) => void;
  fitEdgePadding?: EdgePadding;
  focusControlsTop?: number;
  showFocusControls?: boolean;
  style?: StyleProp<ViewStyle>;
};

const CAMERA_UPDATE_INTERVAL_MS = 1000;
const FOLLOW_CAMERA_ANIMATION_MS = 700;
const CAMERA_MIN_MOVE_METERS = 6;
const DEFAULT_DELTA = 0.04;
const DEFAULT_PADDING: EdgePadding = {
  top: 140,
  right: 70,
  bottom: 260,
  left: 70,
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

const coordinateDistanceMeters = (from?: any, to?: any) => {
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

const getBearing = (from: LatLng, to: LatLng) => {
  const fromLat = (from.latitude * Math.PI) / 180;
  const toLat = (to.latitude * Math.PI) / 180;
  const deltaLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(deltaLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const distanceSquared = (from: LatLng, to: LatLng) => {
  const latitude = to.latitude - from.latitude;
  const longitude = to.longitude - from.longitude;
  return latitude * latitude + longitude * longitude;
};

const getLocalRouteHeading = (
  location: MapCoordinate | null | undefined,
  route: LatLng[],
) => {
  if (!location || route.length < 2) return null;

  const current = toLatLng(location);
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  route.forEach((coordinate, index) => {
    const nextDistance = distanceSquared(current, coordinate);
    if (nextDistance < closestDistance) {
      closestDistance = nextDistance;
      closestIndex = index;
    }
  });

  const fromIndex = Math.min(closestIndex, route.length - 2);
  const toIndex = Math.min(fromIndex + 2, route.length - 1);
  return getBearing(route[fromIndex], route[toIndex]);
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
        coordinateDistanceMeters(previous, nextLocation) < CAMERA_MIN_MOVE_METERS)
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
    const elapsed = Date.now() - lastUpdateRef.current;
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

// A return trip's mid-trip stop is a waypoint the driver comes back from -
// not a drop - and its final stop is pickup and drop at once, since a
// return trip's drop is always forced equal to pickup server-side. Labeling
// either of those "Drop" misleads the passenger about what's actually
// happening, hence the two extra kinds beyond the plain one-way pair.
const PLACE_MARKER_STYLE: Record<TargetKind, { color: string; label: string; glyph: string }> = {
  pickup: { color: "#20B768", label: "Pickup", glyph: "P" },
  dropoff: { color: "#F97316", label: "Drop", glyph: "D" },
  destination: { color: "#7C3AED", label: "Return Point", glyph: "R" },
  pickup_drop: { color: "#20B768", label: "Pickup & Drop", glyph: "P" },
};

function PlaceMarker({ kind }: { kind: TargetKind }) {
  const { color, label, glyph } = PLACE_MARKER_STYLE[kind];
  return (
    <View style={styles.placeMarkerWrap}>
      <View style={[styles.placeLabel, { borderColor: `${color}33` }]}>
        <Text style={[styles.placeLabelText, { color }]}>{label}</Text>
      </View>
      <View style={[styles.placePin, { backgroundColor: color }]}>
        <Text style={styles.placePinText}>{glyph}</Text>
      </View>
      <View style={[styles.placePinTip, { borderTopColor: color }]} />
    </View>
  );
}

export default function DriverStyleRideMap({
  vehicleLocation,
  target,
  targetKind,
  tripStart,
  includeTripStartInFocus = false,
  routeCoordinates = [],
  routeColor = "#20B768",
  vehicleImage,
  followVehicle = true,
  followZoom = 16,
  followPitch = 0,
  onFollowStateChange,
  fitEdgePadding = DEFAULT_PADDING,
  focusControlsTop = 170,
  showFocusControls = true,
  style,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const hasFitInitialBounds = useRef(false);
  const lastAnimatedCameraRef = useRef<LatLng | null>(null);
  const markerTrackingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tracksVehicleMarkerChanges, setTracksVehicleMarkerChanges] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasUserMovedMap, setHasUserMovedMap] = useState(false);
  const locationSourceKey = vehicleLocation
    ? `${vehicleLocation.ride_id || "ride"}:${vehicleLocation.driver_id || "driver"}`
    : "waiting";
  // Only the real road-following route (not the vehicle-to-target fallback
  // line computed below from this hook's own output) is safe to feed back
  // in here for road-snapped interpolation.
  const routePoints = useMemo(
    () =>
      routeCoordinates.length > 1
        ? routeCoordinates.filter(isValidCoordinate).map(toLatLng)
        : null,
    [routeCoordinates],
  );
  const { location: smoothVehicleLocation } = useSmoothLocation(
    vehicleLocation,
    locationSourceKey,
    routePoints,
  );
  const renderedVehicleLocation = useMemo(
    () => smoothVehicleLocation ?? vehicleLocation,
    [smoothVehicleLocation, vehicleLocation],
  );
  const cameraVehicleLocation = useFollowCameraLocation(
    renderedVehicleLocation,
    followVehicle,
  );
  const vehicleMarkerImage =
    vehicleImage || require("../../../assets/icons/map/car.png");

  const routeLine = useMemo(() => {
    if (routeCoordinates.length > 1) {
      return routeCoordinates.filter(isValidCoordinate).map(toLatLng);
    }
    if (renderedVehicleLocation) {
      return [renderedVehicleLocation, target]
        .filter(isValidCoordinate)
        .map(toLatLng);
    }
    return [];
  }, [renderedVehicleLocation, routeCoordinates, target]);

  const routeHeading = useMemo(() => {
    const localRouteHeading = getLocalRouteHeading(
      renderedVehicleLocation,
      routeLine,
    );
    const liveHeading = Number(renderedVehicleLocation?.heading);
    const isMoving = Number(vehicleLocation?.speed || 0) >= 2;
    if (isMoving && Number.isFinite(liveHeading)) return liveHeading;
    if (localRouteHeading != null) return localRouteHeading;
    return Number.isFinite(liveHeading) ? liveHeading : 0;
  }, [renderedVehicleLocation, routeLine, vehicleLocation?.speed]);
  const visibleCoordinates = useMemo(
    () =>
      [
        renderedVehicleLocation,
        target,
        ...routeLine,
        includeTripStartInFocus ? tripStart : null,
      ]
        .filter(isValidCoordinate)
        .map(toLatLng),
    [includeTripStartInFocus, renderedVehicleLocation, routeLine, target, tripStart],
  );

  useEffect(() => {
    setTracksVehicleMarkerChanges(Boolean(vehicleMarkerImage));
    if (markerTrackingTimeoutRef.current) {
      clearTimeout(markerTrackingTimeoutRef.current);
      markerTrackingTimeoutRef.current = null;
    }
  }, [vehicleMarkerImage]);

  useEffect(() => {
    return () => {
      if (markerTrackingTimeoutRef.current) {
        clearTimeout(markerTrackingTimeoutRef.current);
      }
    };
  }, []);

  const handleVehicleImageReady = useCallback(() => {
    if (markerTrackingTimeoutRef.current) {
      clearTimeout(markerTrackingTimeoutRef.current);
    }
    markerTrackingTimeoutRef.current = setTimeout(
      () => setTracksVehicleMarkerChanges(false),
      Platform.OS === "android" ? 700 : 150,
    );
  }, []);

  // react-native-maps freezes a marker's rendered bitmap once
  // tracksViewChanges goes false, so the icon stops rotating even though
  // its coordinate keeps moving. Re-arm tracking whenever the heading
  // moves enough to matter, then let it re-freeze shortly after.
  const lastFrozenHeadingRef = useRef<number | null>(null);
  useEffect(() => {
    if (!Number.isFinite(routeHeading)) return;
    const previous = lastFrozenHeadingRef.current;
    const changed =
      previous == null ||
      Math.abs(((routeHeading - previous + 540) % 360) - 180) > 3;
    if (!changed) return;

    setTracksVehicleMarkerChanges(true);
    if (markerTrackingTimeoutRef.current) {
      clearTimeout(markerTrackingTimeoutRef.current);
    }
    markerTrackingTimeoutRef.current = setTimeout(() => {
      lastFrozenHeadingRef.current = routeHeading;
      setTracksVehicleMarkerChanges(false);
    }, Platform.OS === "android" ? 700 : 150);
  }, [routeHeading]);

  const focusVehicle = useCallback(() => {
    if (!renderedVehicleLocation) return;
    setHasUserMovedMap(false);
    onFollowStateChange?.(true);
    mapRef.current?.animateCamera(
      {
        center: toLatLng(renderedVehicleLocation),
        heading: 0,
        pitch: followPitch,
        zoom: followZoom,
      },
      { duration: 600 },
    );
  }, [
    followPitch,
    followZoom,
    onFollowStateChange,
    renderedVehicleLocation,
  ]);

  const focusFullRoute = useCallback(() => {
    if (visibleCoordinates.length < 2) return;
    setHasUserMovedMap(true);
    onFollowStateChange?.(false);
    mapRef.current?.fitToCoordinates(visibleCoordinates, {
      edgePadding: fitEdgePadding,
      animated: true,
    });
    setTimeout(() => {
      mapRef.current?.animateCamera(
        { heading: 0, pitch: 0 },
        { duration: 380 },
      );
    }, 430);
  }, [fitEdgePadding, onFollowStateChange, visibleCoordinates]);

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
          { heading: 0, pitch: 0 },
          { duration: 340 },
        );
      }, 430);
      hasFitInitialBounds.current = true;
    }, 500);
    return () => {
      clearTimeout(timeout);
      if (pitchTimeout) clearTimeout(pitchTimeout);
    };
  }, [fitEdgePadding, followVehicle, hasUserMovedMap, isMapReady, visibleCoordinates]);

  useEffect(() => {
    const next = cameraVehicleLocation ?? renderedVehicleLocation;
    if (!followVehicle || !next) return;
    const center = toLatLng(next);
    if (
      lastAnimatedCameraRef.current &&
      coordinateDistanceMeters(lastAnimatedCameraRef.current, center) <
        CAMERA_MIN_MOVE_METERS
    ) {
      return;
    }
    lastAnimatedCameraRef.current = center;

    mapRef.current?.animateCamera(
      {
        center,
        heading: 0,
        pitch: followVehicle ? followPitch : 0,
        zoom: followZoom,
      },
      { duration: FOLLOW_CAMERA_ANIMATION_MS },
    );
  }, [
    cameraVehicleLocation,
    followPitch,
    followVehicle,
    followZoom,
    renderedVehicleLocation,
  ]);

  const controlsVisible =
    showFocusControls &&
    Boolean(renderedVehicleLocation) &&
    routeLine.length > 1;

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: renderedVehicleLocation?.latitude ?? target.latitude,
          longitude: renderedVehicleLocation?.longitude ?? target.longitude,
          latitudeDelta: DEFAULT_DELTA,
          longitudeDelta: DEFAULT_DELTA,
        }}
        showsCompass={false}
        showsMyLocationButton={false}
        showsBuildings
        pitchEnabled={followPitch > 0}
        rotateEnabled={followPitch > 0}
        userInterfaceStyle="light"
        customMapStyle={PASSENGER_LIGHT_MAP_STYLE}
        onMapReady={() => setIsMapReady(true)}
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

        <Marker coordinate={toLatLng(target)} anchor={{ x: 0.5, y: 1 }}>
          <PlaceMarker kind={targetKind} />
        </Marker>

        {tripStart && (targetKind === "dropoff" || targetKind === "destination") ? (
          <Marker coordinate={toLatLng(tripStart)} anchor={{ x: 0.5, y: 1 }}>
            <PlaceMarker kind="pickup" />
          </Marker>
        ) : null}

        {renderedVehicleLocation ? (
          <Marker
            coordinate={toLatLng(renderedVehicleLocation)}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={100}
            tracksViewChanges={tracksVehicleMarkerChanges}
          >
            <VehicleMarker
              source={vehicleMarkerImage}
              heading={routeHeading}
              size={46}
              active
              fixedForward={followVehicle}
              onImageReady={handleVehicleImageReady}
            />
          </Marker>
        ) : null}
      </MapView>

      {controlsVisible ? (
        <View style={[styles.controlsPosition, { top: focusControlsTop }]}>
          <View style={styles.controls}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Focus driver vehicle"
              activeOpacity={0.8}
              onPress={focusVehicle}
              style={[styles.controlButton, followVehicle && styles.controlButtonActive]}
            >
              <Ionicons
                name="car-sport-outline"
                size={22}
                color={followVehicle ? "#FFFFFF" : "#0B3D2E"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Show full route"
              activeOpacity={0.8}
              onPress={focusFullRoute}
              style={styles.controlButton}
            >
              <Ionicons name="map-outline" size={22} color="#0B3D2E" />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  map: { ...StyleSheet.absoluteFillObject },
  placeMarkerWrap: { alignItems: "center" },
  placeLabel: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
    elevation: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  placeLabelText: { fontSize: 11, fontWeight: "900" },
  placePin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  placePinText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  placePinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -3,
  },
  controlsPosition: { position: "absolute", right: 14, zIndex: 20 },
  controls: {
    width: 46,
    gap: 10,
  },
  controlButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.09)",
    elevation: 7,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  controlButtonActive: { backgroundColor: "#159A5B" },
});
