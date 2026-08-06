import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

/**
 * Driver's current GPS position for map routing.
 * Stabilised: only triggers a state update when lat/lng change meaningfully.
 * 
 * Google Play Policy Compliance:
 * We modified this hook to avoid calling Location.requestForegroundPermissionsAsync()
 * on initialization or inside useEffect automatically. Instead, it checks status using
 * Location.getForegroundPermissionsAsync(). We added `permissionGrantedTrigger` to the 
 * useEffect dependency array so that once permission is granted (via the user-triggered
 * disclosure modal), tracking begins automatically without prompt spamming.
 */
export function useDriverLocation(permissionGrantedTrigger = null) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const locationRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let locationSubscription = null;

    const load = async () => {
      try {
        // Query current permission status without prompting the user.
        // This ensures no location dialog appears automatically on app startup.
        const { status } = await Location.getForegroundPermissionsAsync();
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

          const next = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading ?? 0,
            speed: position.coords.speed ?? 0,
            accuracy: position.coords.accuracy ?? null,
            timestamp: position.timestamp,
          };

          // Skip setState if lat/lng haven't changed meaningfully (< ~1m)
          const prev = locationRef.current;
          if (
            prev &&
            Math.abs(prev.latitude - next.latitude) < 0.00001 &&
            Math.abs(prev.longitude - next.longitude) < 0.00001 &&
            Math.abs((prev.heading ?? 0) - (next.heading ?? 0)) < 1
          ) {
            return;
          }

          locationRef.current = next;
          setLocation(next);
          setError(null);
          setLoading(false);
        };

        const cached = await Location.getLastKnownPositionAsync({
          maxAge: 60 * 1000,
          requiredAccuracy: 200,
        });
        if (cached) {
          updateLocation(cached);
          if (!cancelled) setLoading(false);
        }

        const subscription = await Location.watchPositionAsync(
          options,
          updateLocation,
        );
        locationSubscription = subscription;

        if (cancelled) {
          subscription.remove();
          return;
        }

        const current = await Location.getCurrentPositionAsync(options);
        updateLocation(current);
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
  }, [permissionGrantedTrigger]);

  return { location, loading, error };
}
