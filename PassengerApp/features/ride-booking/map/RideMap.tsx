import DriverStyleRideMap from "./DriverStyleRideMap";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageSourcePropType, StyleProp, ViewStyle } from "react-native";
import type { EdgePadding } from "react-native-maps";
import {
  fallbackRoute,
  getCachedDirections_withCache,
  type DirectionsResult,
} from "../../../services/maps/directionsApi";
import type { MapCoordinate, NearbyVehicle } from "./vehicleMapTypes";

type Coordinate = MapCoordinate;

type TargetKind = "pickup" | "dropoff" | "destination" | "pickup_drop";

type Props = {
  location: Coordinate;
  destination: Coordinate | null;
  driverLocation?: Coordinate | null;
  nearbyVehicles?: NearbyVehicle[];
  rideStatus?: string;
  // Overrides the default pickup/dropoff inference below - needed for a
  // return trip, where the map target is a mid-trip waypoint or the
  // pickup-that's-also-the-drop, neither of which is a plain "dropoff".
  targetKind?: TargetKind;
  onMapPress?: (event: any) => void;
  followVehicle?: boolean;
  followPitch?: number;
  onFollowStateChange?: (following: boolean) => void;
  vehicleImage?: ImageSourcePropType;
  showDriverMarker?: boolean;
  style?: StyleProp<ViewStyle>;
  fitEdgePadding?: EdgePadding;
  routeColor?: string;
  showPickupMarker?: boolean;
  tripStartCoordinate?: Coordinate | null;
  pickupLabel?: string;
  dropoffLabel?: string;
  includePickupInFocus?: boolean;
  showFocusControls?: boolean;
  focusControlsTop?: number;
  onRouteInfoChange?: (route: DirectionsResult | null) => void;
};

const roundCoordinate = (value?: number) =>
  Number.isFinite(value) ? Number(value?.toFixed(5)) : null;

const distanceMeters = (from: Coordinate, to: Coordinate) => {
  const latScale = 111320;
  const lngScale = latScale * Math.cos(((from.latitude + to.latitude) / 2) * Math.PI / 180);
  return Math.hypot(
    (to.latitude - from.latitude) * latScale,
    (to.longitude - from.longitude) * lngScale,
  );
};

export default function RideMap({
  location,
  destination,
  driverLocation,
  rideStatus,
  targetKind,
  followVehicle = false,
  followPitch = 0,
  onFollowStateChange,
  vehicleImage,
  style,
  fitEdgePadding,
  routeColor = "#20B768",
  showPickupMarker = true,
  tripStartCoordinate,
  includePickupInFocus = true,
  showFocusControls = true,
  focusControlsTop,
  onRouteInfoChange,
}: Props) {
  const normalizedStatus = String(rideStatus || "").toUpperCase();
  // RETURNING is a return trip driving its second leg - still "on trip" in
  // every sense that matters here (route to an active target, not resting
  // at the nominal pickup). Excluding it made activeTarget below fall back
  // to `location` instead of the caller's `destination`, only landing on
  // the right coordinate by coincidence when the two happened to match.
  const isOnTrip = normalizedStatus === "STARTED" || normalizedStatus === "RETURNING";
  const activeTarget = isOnTrip && destination ? destination : location;
  const displayDriverLocation = driverLocation ?? undefined;
  const activeOrigin = isOnTrip ? tripStartCoordinate || location : displayDriverLocation ?? location;
  const activeOriginLatitude = activeOrigin.latitude;
  const activeOriginLongitude = activeOrigin.longitude;
  const [routeOrigin, setRouteOrigin] = useState<Coordinate>(activeOrigin);
  const lastRouteAt = useRef(Date.now());
  const routeSourceKey = displayDriverLocation
    ? `${displayDriverLocation.ride_id || "ride"}:${displayDriverLocation.driver_id || "driver"}`
    : "pickup-fallback";
  const lastRouteSourceKey = useRef(routeSourceKey);

  useEffect(() => {
    if (lastRouteSourceKey.current === routeSourceKey) return;
    lastRouteSourceKey.current = routeSourceKey;
    lastRouteAt.current = Date.now();
    setRouteOrigin(activeOrigin);
  }, [activeOrigin, routeSourceKey]);

  useEffect(() => {
    const nextOrigin = { latitude: activeOriginLatitude, longitude: activeOriginLongitude };
    const moved = distanceMeters(routeOrigin, nextOrigin);
    const elapsed = Date.now() - lastRouteAt.current;
    if (moved >= 100 || (moved >= 30 && elapsed >= 15000)) {
      lastRouteAt.current = Date.now();
      setRouteOrigin(nextOrigin);
    }
  }, [activeOriginLatitude, activeOriginLongitude, routeOrigin]);
  const originLat = roundCoordinate(routeOrigin?.latitude);
  const originLng = roundCoordinate(routeOrigin?.longitude);
  const targetLat = roundCoordinate(activeTarget?.latitude);
  const targetLng = roundCoordinate(activeTarget?.longitude);
  const fallbackRouteCoordinates = useMemo(
    () => {
      if (
        originLat == null ||
        originLng == null ||
        targetLat == null ||
        targetLng == null
      ) {
        return [];
      }

      return [
        { latitude: originLat, longitude: originLng },
        { latitude: targetLat, longitude: targetLng },
      ];
    },
    [originLat, originLng, targetLat, targetLng],
  );
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>(
    fallbackRouteCoordinates,
  );

  useEffect(() => {
    let cancelled = false;

    const loadRoute = async () => {
      if (
        originLat == null ||
        originLng == null ||
        targetLat == null ||
        targetLng == null
      ) {
        setRouteCoordinates([]);
        onRouteInfoChange?.(null);
        return;
      }

      const fallback = fallbackRoute(originLat, originLng, targetLat, targetLng);
      setRouteCoordinates(fallbackRouteCoordinates);
      onRouteInfoChange?.(fallback);

      const directions = await getCachedDirections_withCache(
        originLat,
        originLng,
        targetLat,
        targetLng,
      );

      if (!cancelled) {
        onRouteInfoChange?.(directions);
        setRouteCoordinates(
          directions?.polyline?.length
            ? directions.polyline
            : fallbackRouteCoordinates,
        );
      }
    };

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [originLat, originLng, targetLat, targetLng, fallbackRouteCoordinates, onRouteInfoChange]);

  return (
    <DriverStyleRideMap
      vehicleLocation={displayDriverLocation}
      target={activeTarget}
      targetKind={targetKind ?? (isOnTrip ? "dropoff" : "pickup")}
      tripStart={
        isOnTrip && showPickupMarker
          ? tripStartCoordinate || location
          : null
      }
      includeTripStartInFocus={includePickupInFocus}
      routeCoordinates={routeCoordinates}
      routeColor={routeColor}
      vehicleImage={vehicleImage}
      followVehicle={followVehicle}
      followPitch={followPitch}
      followLookAheadMeters={isOnTrip ? 65 : 45}
      onFollowStateChange={onFollowStateChange}
      showFocusControls={showFocusControls}
      focusControlsTop={focusControlsTop}
      style={style}
      fitEdgePadding={fitEdgePadding}
    />
  );
}








