import { useEffect, useRef, useState } from "react";
import { getCachedDirections_withCache } from "../services/routing/mapboxRoutingService";

const routeDistanceMeters = (from, to) => {
  const latScale = 111320;
  const lngScale = latScale * Math.cos(((from.latitude + to.latitude) / 2) * Math.PI / 180);
  return Math.hypot(
    (to.latitude - from.latitude) * latScale,
    (to.longitude - from.longitude) * lngScale,
  );
};

/**
 * Fetches a road-following route between two coordinates via Mapbox Directions API.
 */
export function useMapboxRoute(origin, destination) {
  const originLatitude = origin.latitude;
  const originLongitude = origin.longitude;
  const [directions, setDirections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routeOrigin, setRouteOrigin] = useState(() => ({ ...origin }));
  const lastRouteAtRef = useRef(Date.now());

  useEffect(() => {
    const nextOrigin = { latitude: originLatitude, longitude: originLongitude };
    const moved = routeDistanceMeters(routeOrigin, nextOrigin);
    const elapsed = Date.now() - lastRouteAtRef.current;
    if (moved >= 100 || (moved >= 30 && elapsed >= 15000)) {
      lastRouteAtRef.current = Date.now();
      setRouteOrigin(nextOrigin);
    }
  }, [originLatitude, originLongitude, routeOrigin]);

  useEffect(() => {
    let cancelled = false;

    const fetchRoute = async () => {
      setLoading(true);
      try {
        const result = await getCachedDirections_withCache(
          routeOrigin.latitude,
          routeOrigin.longitude,
          destination.latitude,
          destination.longitude,
        );
        if (!cancelled) {
          setDirections(result);
        }
      } catch (error) {
        console.error("useMapboxRoute:", error);
        if (!cancelled) {
          setDirections(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRoute();

    return () => {
      cancelled = true;
    };
  }, [
    routeOrigin.latitude,
    routeOrigin.longitude,
    destination.latitude,
    destination.longitude,
  ]);

  return { directions, loading };
}
