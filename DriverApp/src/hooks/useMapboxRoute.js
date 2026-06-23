import { useEffect, useState } from "react";
import { getCachedDirections_withCache } from "../services/routing/mapboxRoutingService";

/**
 * Fetches a road-following route between two coordinates via Mapbox Directions API.
 */
export function useMapboxRoute(origin, destination) {
  const [directions, setDirections] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchRoute = async () => {
      setLoading(true);
      try {
        const result = await getCachedDirections_withCache(
          origin.latitude,
          origin.longitude,
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
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude,
  ]);

  return { directions, loading };
}
