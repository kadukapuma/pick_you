import MapboxRideMap from "../map/MapboxRideMap";
import { useEffect, useMemo, useState } from "react";
import { getCachedDirections_withCache } from "../../services/routing/mapboxRoutingService";

type Coordinate = { latitude: number; longitude: number; heading?: number };

type Props = {
  location: Coordinate;
  destination: Coordinate | null;
  driverLocation?: Coordinate | null;
  rideStatus?: string;
  onMapPress?: (event: any) => void;
};

const roundCoordinate = (value?: number) =>
  Number.isFinite(value) ? Number(value?.toFixed(5)) : null;

export default function RideMap({
  location,
  destination,
  driverLocation,
  rideStatus,
  onMapPress,
}: Props) {
  const isOnTrip = String(rideStatus || "").toUpperCase() === "STARTED";
  const activeTarget = isOnTrip && destination ? destination : location;
  const activeOrigin = driverLocation ?? location;
  const originLat = roundCoordinate(activeOrigin?.latitude);
  const originLng = roundCoordinate(activeOrigin?.longitude);
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
    <MapboxRideMap
      pickup={location}
      dropoff={destination}
      driverLocation={driverLocation}
      routeCoordinates={routeCoordinates}
      onMapPress={onMapPress}
    />
  );
}
