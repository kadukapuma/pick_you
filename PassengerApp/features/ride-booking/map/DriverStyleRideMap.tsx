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

type Props = {
  vehicleLocation?: MapCoordinate | null;
  target: MapCoordinate;
  targetKind: "pickup" | "dropoff";
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

const CAMERA_UPDATE_INTERVAL_MS = 250;
const FOLLOW_CAMERA_ANIMATION_MS = 350;
const DEFAULT_DELTA = 0.04;
const DEFAULT_PADDING: EdgePadding = {
  top: 140,
  right: 70,
  bottom: 260,
  left: 70,
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

const moveCoordinate = (
  coordinate: MapCoordinate,
  heading: number,
  distanceMeters: number,
): LatLng => {
  if (distanceMeters <= 0) return toLatLng(coordinate);
  const earthRadius = 6371000;
  const angularDistance = distanceMeters / earthRadius;
  const bearing = (heading * Math.PI) / 180;
  const latitude = (coordinate.latitude * Math.PI) / 180;
  const longitude = (coordinate.longitude * Math.PI) / 180;
  const nextLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const nextLongitude =
    longitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(nextLatitude),
    );

  return {
    latitude: (nextLatitude * 180) / Math.PI,
    longitude: (nextLongitude * 180) / Math.PI,
  };
};

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
    const elapsed = Date.now() - lastUpdateRef.current;
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

function PlaceMarker({
  kind,
}: {
  kind: "pickup" | "dropoff";
}) {
  const isPickup = kind === "pickup";
  const color = isPickup ? "#20B768" : "#F97316";
  const label = isPickup ? "Pickup" : "Drop";
  return (
    <View style={styles.placeMarkerWrap}>
      <View style={[styles.placeLabel, { borderColor: `${color}33` }]}>
        <Text style={[styles.placeLabelText, { color }]}>{label}</Text>
      </View>
      <View style={[styles.placePin, { backgroundColor: color }]}>
        <Text style={styles.placePinText}>{isPickup ? "P" : "D"}</Text>
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
  followPitch = 45,
  followLookAheadMeters = 55,
  onFollowStateChange,
  fitEdgePadding = DEFAULT_PADDING,
  focusControlsTop = 170,
  showFocusControls = true,
  style,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const hasFitInitialBounds = useRef(false);
  const markerTrackingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tracksVehicleMarkerChanges, setTracksVehicleMarkerChanges] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasUserMovedMap, setHasUserMovedMap] = useState(false);
  const locationSourceKey = vehicleLocation
    ? `${vehicleLocation.ride_id || "ride"}:${vehicleLocation.driver_id || "driver"}`
    : "waiting";
  const { location: smoothVehicleLocation } = useSmoothLocation(
    vehicleLocation,
    locationSourceKey,
  );
  const renderedVehicleLocation = smoothVehicleLocation ?? vehicleLocation;
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
  const overviewHeading = useMemo(
    () =>
      routeLine.length > 1
        ? getBearing(routeLine[0], routeLine[routeLine.length - 1])
        : routeHeading,
    [routeHeading, routeLine],
  );

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
    setTracksVehicleMarkerChanges(true);
    if (markerTrackingTimeoutRef.current) {
      clearTimeout(markerTrackingTimeoutRef.current);
    }
    markerTrackingTimeoutRef.current = setTimeout(
      () => setTracksVehicleMarkerChanges(false),
      Platform.OS === "android" ? 700 : 150,
    );
  }, [followVehicle, vehicleMarkerImage]);

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

  const focusVehicle = useCallback(() => {
    if (!renderedVehicleLocation) return;
    setHasUserMovedMap(false);
    onFollowStateChange?.(true);
    mapRef.current?.animateCamera(
      {
        center: moveCoordinate(
          renderedVehicleLocation,
          routeHeading,
          followLookAheadMeters,
        ),
        heading: routeHeading,
        pitch: followPitch,
        zoom: followZoom,
      },
      { duration: 600 },
    );
  }, [
    followPitch,
    followLookAheadMeters,
    followZoom,
    onFollowStateChange,
    renderedVehicleLocation,
    routeHeading,
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
        { heading: overviewHeading, pitch: 34 },
        { duration: 380 },
      );
    }, 430);
  }, [fitEdgePadding, onFollowStateChange, overviewHeading, visibleCoordinates]);

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
          { heading: overviewHeading, pitch: 32 },
          { duration: 340 },
        );
      }, 430);
      hasFitInitialBounds.current = true;
    }, 500);
    return () => {
      clearTimeout(timeout);
      if (pitchTimeout) clearTimeout(pitchTimeout);
    };
  }, [fitEdgePadding, followVehicle, hasUserMovedMap, isMapReady, overviewHeading, visibleCoordinates]);

  useEffect(() => {
    const next = cameraVehicleLocation ?? renderedVehicleLocation;
    if (!followVehicle || !next) return;
    mapRef.current?.animateCamera(
      {
        center: moveCoordinate(next, routeHeading, followLookAheadMeters),
        heading: routeHeading,
        pitch: followPitch,
        zoom: followZoom,
      },
      { duration: FOLLOW_CAMERA_ANIMATION_MS },
    );
  }, [
    cameraVehicleLocation,
    followPitch,
    followLookAheadMeters,
    followVehicle,
    followZoom,
    renderedVehicleLocation,
    routeHeading,
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
        pitchEnabled
        rotateEnabled
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

        {tripStart && targetKind === "dropoff" ? (
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
              size={76}
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
