import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import api from "./api";

const BACKGROUND_TASK = "active-ride-location";
const ACTIVE_RIDE_KEY = "activeRideLocationId";
const PENDING_LOCATION_KEY = "pendingDriverLocations";
const LEGACY_PENDING_LOCATION_KEY = "pendingDriverLocation";
const LOCATION_SEQUENCE_KEY = "driverLocationSequence";

let watchSubscription = null;
let heartbeatTimer = null;
let activeRideId = null;
let locationSequence = Date.now();

const nextSequence = async () => {
  const stored = Number(await AsyncStorage.getItem(LOCATION_SEQUENCE_KEY));
  locationSequence = Math.max(locationSequence, Number.isFinite(stored) ? stored : 0) + 1;
  await AsyncStorage.setItem(LOCATION_SEQUENCE_KEY, String(locationSequence));
  return locationSequence;
};

const buildPayload = async (coords, rideId = activeRideId) => ({
  ride_id: rideId || undefined,
  latitude: coords.latitude,
  longitude: coords.longitude,
  heading: coords.heading >= 0 && coords.heading <= 360 ? coords.heading : 0,
  speed: Math.max(coords.speed ?? 0, 0),
  accuracy: coords.accuracy ?? null,
  recorded_at: new Date().toISOString(),
  sequence: await nextSequence(),
});

const readPendingQueue = async () => {
  const current = await AsyncStorage.getItem(PENDING_LOCATION_KEY);
  const legacy = await AsyncStorage.getItem(LEGACY_PENDING_LOCATION_KEY);
  const queue = current ? JSON.parse(current) : [];

  if (legacy) {
    queue.push(JSON.parse(legacy));
    await AsyncStorage.removeItem(LEGACY_PENDING_LOCATION_KEY);
  }

  if (!Array.isArray(queue)) return [];

  // Filter out any stale items older than 24 hours (86400000 ms)
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const validQueue = queue.filter((item) => {
    if (!item?.recorded_at) return false;
    const time = new Date(item.recorded_at).getTime();
    return !isNaN(time) && time >= cutoff;
  });

  if (validQueue.length !== queue.length) {
    await writePendingQueue(validQueue);
  }

  return validQueue;
};

const writePendingQueue = async (queue) => {
  if (queue.length === 0) {
    await AsyncStorage.removeItem(PENDING_LOCATION_KEY);
    return;
  }

  await AsyncStorage.setItem(PENDING_LOCATION_KEY, JSON.stringify(queue.slice(-500)));
};

const enqueuePayload = async (payload) => {
  const queue = await readPendingQueue();
  queue.push(payload);
  await writePendingQueue(queue);
};

const publishPayload = async (payload) => {
  const network = await NetInfo.fetch();

  if (!network.isConnected) {
    await enqueuePayload(payload);
    return;
  }

  try {
    const pendingQueue = await readPendingQueue();
    const successfulPayloads = [];

    for (const pendingPayload of pendingQueue) {
      try {
        const pendingResponse = await api.post("/driver-locations", pendingPayload);
        await handleServerResponse(pendingResponse);
        successfulPayloads.push(pendingPayload);
      } catch (err) {
        if (err.response?.status === 422) {
          if (__DEV__) {
            console.warn("Discarding invalid pending driver location:", err.response?.data);
          }
          successfulPayloads.push(pendingPayload); // Discard from queue
        } else {
          break; // Stop queue processing on connection/server errors
        }
      }
    }

    if (successfulPayloads.length > 0) {
      const remainingQueue = pendingQueue.filter(p => !successfulPayloads.includes(p));
      await writePendingQueue(remainingQueue);
    }

    try {
      const response = await api.post("/driver-locations", payload);
      await handleServerResponse(response);
    } catch (err) {
      if (err.response?.status === 422) {
        if (__DEV__) {
          console.warn("Current driver location payload failed validation:", err.response?.data);
        }
        const errors = err.response?.data?.errors;
        if (errors?.ride_id) {
          await clearActiveRideLocationSync();
        }
      } else {
        await enqueuePayload(payload);
      }
    }
  } catch (error) {
    if (__DEV__) console.log("driverLocationSync error:", error?.message || error);
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
  await publishPayload(await buildPayload(coords, rideId));
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

  const cached = await Location.getLastKnownPositionAsync({
    maxAge: active ? 30 * 1000 : 60 * 1000,
    requiredAccuracy: active ? 100 : 200,
  });
  if (cached?.coords) {
    await postLocation(cached.coords);
  }

  watchSubscription = await Location.watchPositionAsync(options, (location) =>
    postLocation(location.coords),
  );

  Location.getCurrentPositionAsync(options)
    .then((current) => postLocation(current.coords))
    .catch((err) => {
      if (__DEV__) console.log("driverLocationSync current fix:", err?.message || err);
    });

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
  // Google Play Compliance: Query background permissions without prompting.
  const permission = await Location.getBackgroundPermissionsAsync();
  if (permission.status !== "granted") {
    if (__DEV__) console.warn("driverLocationSync: background permission not granted, skipping tracking start");
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
  // Google Play Compliance: Query foreground permission without prompting.
  const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
  if (fgStatus !== "granted") {
    if (__DEV__) console.log("driverLocationSync: foreground permission not granted, skipping start");
    return;
  }

  const storedRideId = await AsyncStorage.getItem(ACTIVE_RIDE_KEY);
  activeRideId = storedRideId ? Number(storedRideId) : null;
  await startForegroundWatch({ active: Boolean(activeRideId) });
  
  if (activeRideId) {
    // Google Play Compliance: Query background permission without prompting.
    const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
    if (bgStatus === "granted") {
      await startBackgroundTracking();
    } else {
      if (__DEV__) console.warn("driverLocationSync: background permission not granted, active ride tracking limited to foreground");
    }
  }
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
