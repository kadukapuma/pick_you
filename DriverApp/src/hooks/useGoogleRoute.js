import { useEffect, useRef, useState } from "react";
import {
  fallbackRoute,
  getCachedDirections_withCache,
} from "../services/routing/googleRoutingService";

const routeDistanceMeters = (from, to) => {
  const latScale = 111320;
  const lngScale =
    latScale * Math.cos(((from.latitude + to.latitude) / 2) * Math.PI / 180);
  return Math.hypot(
    (to.latitude - from.latitude) * latScale,
    (to.longitude - from.longitude) * lngScale,
  );
};

export function useGoogleRoute(origin, destination, options = {}) {
  const enabled = options.enabled ?? true;
  const originLatitude = origin.latitude;
  const originLongitude = origin.longitude;
  const destLatitude = destination?.latitude;
  const destLongitude = destination?.longitude;
  const [directions, setDirections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [routeOriginLat, setRouteOriginLat] = useState(() => originLatitude);
  const [routeOriginLng, setRouteOriginLng] = useState(() => originLongitude);
  const lastRouteAtRef = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const moved = routeDistanceMeters(
      { latitude: routeOriginLat, longitude: routeOriginLng },
      { latitude: originLatitude, longitude: originLongitude },
    );
    const elapsed = Date.now() - lastRouteAtRef.current;
    if (moved >= 100 || (moved >= 30 && elapsed >= 15000)) {
      lastRouteAtRef.current = Date.now();
      setRouteOriginLat(originLatitude);
      setRouteOriginLng(originLongitude);
    }
  }, [enabled, originLatitude, originLongitude, routeOriginLat, routeOriginLng]);

  useEffect(() => {
    if (!enabled || destLatitude == null || destLongitude == null) {
      setDirections(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchRoute = async () => {
      const routeOriginIsStale =
        routeDistanceMeters(
          { latitude: routeOriginLat, longitude: routeOriginLng },
          { latitude: originLatitude, longitude: originLongitude },
        ) >= 100;

      if (routeOriginIsStale) return;

      setLoading(true);
      setDirections(
        fallbackRoute(
          routeOriginLat,
          routeOriginLng,
          destLatitude,
          destLongitude,
        ),
      );
      try {
        const result = await getCachedDirections_withCache(
          routeOriginLat,
          routeOriginLng,
          destLatitude,
          destLongitude,
        );
        if (!cancelled) setDirections(result);
      } catch (error) {
        console.error("useGoogleRoute:", error);
        if (!cancelled) setDirections(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRoute();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    originLatitude,
    originLongitude,
    routeOriginLat,
    routeOriginLng,
    destLatitude,
    destLongitude,
  ]);

  return { directions, loading };
}
