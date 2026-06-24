import { useEffect, useState } from "react";
import * as Location from "expo-location";

/**
 * Driver's current GPS position for map routing.
 */
export function useDriverLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let locationSubscription = null;

    const load = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) {
            setError("Location permission denied");
            setLoading(false);
          }
          return;
        }

        const options = {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
          timeInterval: 5000,
        };

        const updateLocation = (position) => {
          if (cancelled) return;

          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading ?? 0,
            speed: position.coords.speed ?? 0,
            accuracy: position.coords.accuracy ?? null,
            timestamp: position.timestamp,
          });
          setError(null);
        };

        const current = await Location.getCurrentPositionAsync(options);
        updateLocation(current);

        const subscription = await Location.watchPositionAsync(
          options,
          updateLocation,
        );
        locationSubscription = subscription;

        if (cancelled) {
          subscription.remove();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to get location");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      locationSubscription?.remove();
    };
  }, []);

  return { location, loading, error };
}
