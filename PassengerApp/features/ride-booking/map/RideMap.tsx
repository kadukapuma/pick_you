import GoogleRideMap from "./GoogleRideMap";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageSourcePropType, StyleProp, ViewStyle } from "react-native";
import type { EdgePadding } from "react-native-maps";
import { getCachedDirections_withCache } from "../../../services/maps/directionsApi";
import type { MapCoordinate, NearbyVehicle } from "./vehicleMapTypes";

type Coordinate = MapCoordinate;

type Props = {
  location: Coordinate;
  destination: Coordinate | null;
  driverLocation?: Coordinate | null;
  nearbyVehicles?: NearbyVehicle[];
  rideStatus?: string;
  onMapPress?: (event: any) => void;
  followVehicle?: boolean;
  onFollowStateChange?: (following: boolean) => void;
  vehicleImage?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  fitEdgePadding?: EdgePadding;
  routeColor?: string;
  showPickupMarker?: boolean;
  dropoffLabel?: string;
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
  nearbyVehicles,
  rideStatus,
  onMapPress,
  followVehicle = false,
  onFollowStateChange,
  vehicleImage,
  style,
  fitEdgePadding,
  routeColor = "#20B768",
  showPickupMarker = true,
  dropoffLabel,
}: Props) {
  const normalizedStatus = String(rideStatus || "").toUpperCase();
  const isOnTrip = normalizedStatus === "STARTED";
  const isAtPickup = normalizedStatus === "ARRIVED";
  const activeTarget = isOnTrip && destination ? destination : location;
  const displayDriverLocation = driverLocation ?? (isOnTrip || isAtPickup ? location : undefined);
  const activeOrigin = displayDriverLocation ?? location;
  const activeOriginLatitude = activeOrigin.latitude;
  const activeOriginLongitude = activeOrigin.longitude;
  const [routeOrigin, setRouteOrigin] = useState<Coordinate>(activeOrigin);
  const lastRouteAt = useRef(Date.now());
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
        return;
      }

      setRouteCoordinates(fallbackRouteCoordinates);

      const directions = await getCachedDirections_withCache(
        originLat,
        originLng,
        targetLat,
        targetLng,
      );

      if (!cancelled) {
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
  }, [originLat, originLng, targetLat, targetLng, fallbackRouteCoordinates]);

  return (
    <GoogleRideMap
      pickup={location}
      dropoff={destination}
      driverLocation={displayDriverLocation}
      nearbyVehicles={nearbyVehicles}
      routeCoordinates={routeCoordinates}
      routeColor={routeColor}
      pickupColor="#20B768"
      onMapPress={onMapPress}
      followVehicle={followVehicle}
      onFollowStateChange={onFollowStateChange}
      vehicleImage={vehicleImage}
      style={style}
      fitEdgePadding={fitEdgePadding}
    />
  );
}








