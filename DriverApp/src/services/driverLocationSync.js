import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import api from "./api";

const BACKGROUND_TASK = "active-ride-location";
const ACTIVE_RIDE_KEY = "activeRideLocationId";
const PENDING_LOCATION_KEY = "pendingDriverLocation";

let watchSubscription = null;
let heartbeatTimer = null;
let activeRideId = null;

const buildPayload = (coords, rideId = activeRideId) => ({
  ride_id: rideId || undefined,
  latitude: coords.latitude,
  longitude: coords.longitude,
  heading: coords.heading ?? 0,
  speed: Math.max(coords.speed ?? 0, 0),
  accuracy: coords.accuracy ?? null,
  recorded_at: new Date().toISOString(),
  sequence: Date.now(),
});

const publishPayload = async (payload) => {
  const network = await NetInfo.fetch();

  if (!network.isConnected) {
    await AsyncStorage.setItem(PENDING_LOCATION_KEY, JSON.stringify(payload));
    return;
  }

  try {
    const pending = await AsyncStorage.getItem(PENDING_LOCATION_KEY);
    if (pending) {
      const pendingResponse = await api.post("/driver-locations", JSON.parse(pending));
      await handleServerResponse(pendingResponse);
      await AsyncStorage.removeItem(PENDING_LOCATION_KEY);
    }
    const response = await api.post("/driver-locations", payload);
    await handleServerResponse(response);
  } catch (error) {
    await AsyncStorage.setItem(PENDING_LOCATION_KEY, JSON.stringify(payload));
    if (__DEV__) console.log("driverLocationSync:", error?.message || error);
  }
};

const handleServerResponse = async (response) => {
  const serverLocation = response?.data?.data ?? response?.data;
  if (activeRideId && serverLocation && !serverLocation.ride_id) {
    await clearActiveRideLocationSync();
  }
};

const postLocation = async (coords, rideId = activeRideId) => {
  if (coords?.latitude == null || coords?.longitude == null) return;
  await publishPayload(buildPayload(coords, rideId));
};

TaskManager.defineTask(BACKGROUND_TASK, async ({ data, error }) => {
  if (error) {
    if (__DEV__) console.warn("activeRideLocation task:", error.message);
    return;
  }

  const locations = data?.locations ?? [];
  const latest = locations[locations.length - 1];
  const rideId = await AsyncStorage.getItem(ACTIVE_RIDE_KEY);

  if (latest?.coords && rideId) {
    await postLocation(latest.coords, Number(rideId));
  }
});

const stopForegroundWatch = () => {
  watchSubscription?.remove();
  watchSubscription = null;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};

const startForegroundWatch = async ({ active }) => {
  stopForegroundWatch();
  const options = active
    ? { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 }
    : { accuracy: Location.Accuracy.Balanced, distanceInterval: 40, timeInterval: 15000 };

  const current = await Location.getCurrentPositionAsync(options);
  await postLocation(current.coords);
  watchSubscription = await Location.watchPositionAsync(options, (location) =>
    postLocation(location.coords),
  );

  if (!active) {
    heartbeatTimer = setInterval(async () => {
      try {
        const position = await Location.getCurrentPositionAsync(options);
        await postLocation(position.coords);
      } catch (_) {
        // A later watch update will retry.
      }
    }, 30000);
  }
};

const startBackgroundTracking = async () => {
  const permission = await Location.requestBackgroundPermissionsAsync();
  if (permission.status !== "granted") {
    if (__DEV__) console.warn("driverLocationSync: background permission denied");
    return;
  }

  if (!(await Location.hasStartedLocationUpdatesAsync(BACKGROUND_TASK))) {
    await Location.startLocationUpdatesAsync(BACKGROUND_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: "Pick You trip tracking",
        notificationBody: "Sharing your location for the active ride.",
        notificationColor: "#00A859",
      },
    });
  }
};

const stopBackgroundTracking = async () => {
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_TASK)) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_TASK);
  }
};

export const startDriverLocationSync = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return;

  const storedRideId = await AsyncStorage.getItem(ACTIVE_RIDE_KEY);
  activeRideId = storedRideId ? Number(storedRideId) : null;
  await startForegroundWatch({ active: Boolean(activeRideId) });
  if (activeRideId) await startBackgroundTracking();
};

export const setActiveRideLocationSync = async (rideId) => {
  activeRideId = Number(rideId);
  await AsyncStorage.setItem(ACTIVE_RIDE_KEY, String(activeRideId));
  await startDriverLocationSync();
};

export const clearActiveRideLocationSync = async () => {
  activeRideId = null;
  await AsyncStorage.removeItem(ACTIVE_RIDE_KEY);
  await stopBackgroundTracking();
  await startForegroundWatch({ active: false });
};

export const stopDriverLocationSync = async ({ force = false } = {}) => {
  if (activeRideId && !force) return;
  stopForegroundWatch();
  if (force) await stopBackgroundTracking();
};
