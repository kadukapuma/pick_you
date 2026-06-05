/**
 * Keeps driver position in driver_locations so the API can build the nearby-driver Redis queue.
 */

import * as Location from "expo-location";
import api from "./api";

let watchSubscription = null;
let heartbeatTimer = null;

const postLocation = async (coords) => {
  if (!coords?.latitude || !coords?.longitude) return;

  try {
    await api.post("/driver-locations", {
      latitude: coords.latitude,
      longitude: coords.longitude,
      heading: coords.heading ?? 0,
      speed: coords.speed ?? 0,
    });
  } catch (error) {
    if (__DEV__) {
      console.log("driverLocationSync:", error?.message || error);
    }
  }
};

export const startDriverLocationSync = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    if (__DEV__) console.warn("driverLocationSync: location permission denied");
    return;
  }

  await stopDriverLocationSync();

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  await postLocation(current.coords);

  watchSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 40,
      timeInterval: 15000,
    },
    (loc) => postLocation(loc.coords),
  );

  heartbeatTimer = setInterval(async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await postLocation(pos.coords);
    } catch (_) {
      /* ignore */
    }
  }, 30000);
};

export const stopDriverLocationSync = async () => {
  if (watchSubscription) {
    watchSubscription.remove();
    watchSubscription = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};
