/**
 * Real-time ride notifications for drivers.
 * Primary: persistent WebSocket. Fallback: HTTP only after socket fails.
 */

import api from "./api";
import createEchoInstance from "./echo";
import { normalizeRidePayload } from "../utils/rideLocation";

const FALLBACK_SYNC_MS = 60_000;
const FALLBACK_DELAY_MS = 4000;

let echoInstance = null;
let subscribedDriverId = null;
let rideEventHandler = null;
let fallbackTimer = null;
let fallbackDelayTimer = null;
let wsConnected = false;
let connectionStatus = "disconnected";
let boundPusherConnection = null;

const listeners = {
  onRide: null,
  onConnectionChange: null,
  onStatusChange: null,
};

const notifyStatus = (status) => {
  connectionStatus = status;
  listeners.onStatusChange?.(status);
};

const notifyConnection = (connected, status = connected ? "connected" : "connecting") => {
  wsConnected = connected;
  listeners.onConnectionChange?.(connected);
  notifyStatus(status);
};

const handleRideEvent = (payload) => {
  const ride = normalizeRidePayload(payload);

  if (!ride?.id) {
    if (__DEV__) console.warn("rideRealtime: ride event missing id", payload);
    return;
  }

  if (!listeners.onRide) {
    if (__DEV__) {
      console.warn("rideRealtime: ride received but no onRide handler", ride.id);
    }
    return;
  }

  listeners.onRide(ride);
};

export const syncPendingRideOnce = async () => {
  try {
    const response = await api.get("/driver/ride-requests");
    const requests = response.data?.data ?? [];

    if (requests.length > 0) {
      handleRideEvent(requests[0]);
      return true;
    }
  } catch (error) {
    if (__DEV__) {
      console.log("rideRealtime sync:", error?.message || error);
    }
  }
  return false;
};

const stopFallbackSync = () => {
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
  if (fallbackDelayTimer) {
    clearTimeout(fallbackDelayTimer);
    fallbackDelayTimer = null;
  }
};

const startFallbackSync = () => {
  if (fallbackTimer) return;

  if (__DEV__) {
    console.log("rideRealtime: fallback HTTP sync active");
  }

  notifyConnection(false, "fallback");
  syncPendingRideOnce();
  fallbackTimer = setInterval(syncPendingRideOnce, FALLBACK_SYNC_MS);
};

const scheduleFallbackIfStillOffline = () => {
  if (fallbackDelayTimer) return;

  fallbackDelayTimer = setTimeout(() => {
    fallbackDelayTimer = null;
    if (!wsConnected) {
      startFallbackSync();
    }
  }, FALLBACK_DELAY_MS);
};

const bindPusherConnection = (pusher) => {
  if (!pusher?.connection?.bind) return;

  if (boundPusherConnection === pusher.connection) {
    const state = pusher.connection.state;
    if (state === "connected") {
      notifyConnection(true);
    } else if (connectionStatus !== "fallback") {
      notifyConnection(false, state === "disconnected" ? "disconnected" : "connecting");
    }
    return;
  }

  boundPusherConnection = pusher.connection;

  pusher.connection.bind("connecting", () => {
    notifyConnection(false, "connecting");
  });

  pusher.connection.bind("connected", () => {
    if (__DEV__) console.log("rideRealtime: WebSocket connected");
    notifyConnection(true);
    stopFallbackSync();
  });

  pusher.connection.bind("disconnected", () => {
    if (__DEV__) console.log("rideRealtime: WebSocket disconnected");
    notifyConnection(false, "disconnected");
    scheduleFallbackIfStillOffline();
  });

  pusher.connection.bind("unavailable", () => {
    notifyConnection(false, "fallback");
    scheduleFallbackIfStillOffline();
  });

  pusher.connection.bind("failed", () => {
    notifyConnection(false, "fallback");
    startFallbackSync();
  });

  pusher.connection.bind("error", (error) => {
    if (__DEV__) {
      console.log("rideRealtime: WebSocket error", error?.error || error);
    }
    notifyConnection(false, "fallback");
    scheduleFallbackIfStillOffline();
  });

  const state = pusher.connection.state;
  if (state === "connected") {
    notifyConnection(true);
    stopFallbackSync();
  } else {
    notifyConnection(false, state === "disconnected" ? "disconnected" : "connecting");
    scheduleFallbackIfStillOffline();
  }
};

const onRideRequestedTargeted = (raw) => {
  const e = raw?.data ?? raw;

  if (__DEV__) {
    console.log("rideRealtime: RideRequestedTargeted", e?.ride_id ?? e?.id);
  }

  handleRideEvent({
    id: e.ride_id ?? e.id,
    ride_code: e.ride_code,
    pickup_address: e.pickup_address,
    pickup_lat: e.pickup_lat,
    pickup_lng: e.pickup_lng,
    drop_address: e.drop_address,
    drop_lat: e.drop_lat,
    drop_lng: e.drop_lng,
    estimated_fare: e.estimated_fare,
    distance_km: e.distance_km,
    passenger_name: e.passenger_name,
    vehicle_type: e.vehicle_type,
    requested_at: e.requested_at,
    status: "REQUESTED",
  });
};

const subscribeToDriverChannel = (driverId) => {
  const channelName = `driver.rides.${driverId}`;
  const channel = echoInstance.private(channelName);

  if (rideEventHandler) {
    channel.unbind(".RideRequestedTargeted", rideEventHandler);
  }

  rideEventHandler = onRideRequestedTargeted;
  channel.listen(".RideRequestedTargeted", rideEventHandler);

  subscribedDriverId = driverId;
};

export const connectRideRealtime = async (
  driverId,
  { onRide, onConnectionChange, onStatusChange } = {},
) => {
  if (!driverId) return;

  listeners.onRide = onRide ?? null;
  listeners.onConnectionChange = onConnectionChange ?? null;
  listeners.onStatusChange = onStatusChange ?? null;
  notifyConnection(false, "connecting");

  const { echo, pusher } = await createEchoInstance();
  echoInstance = echo;

  bindPusherConnection(pusher);

  if (subscribedDriverId !== driverId) {
    if (subscribedDriverId && echoInstance) {
      echoInstance.leaveChannel(`private-driver.rides.${subscribedDriverId}`);
      rideEventHandler = null;
    }
    subscribeToDriverChannel(driverId);
  }

  return echoInstance;
};

export const disconnectRideRealtime = async ({ clearListeners = true } = {}) => {
  stopFallbackSync();
  notifyConnection(false, "disconnected");

  if (echoInstance && subscribedDriverId) {
    echoInstance.leaveChannel(`private-driver.rides.${subscribedDriverId}`);
  }

  subscribedDriverId = null;
  rideEventHandler = null;

  if (clearListeners) {
    listeners.onRide = null;
    listeners.onConnectionChange = null;
    listeners.onStatusChange = null;
  }
};

export const isRideRealtimeConnected = () => wsConnected;
export const getRideRealtimeStatus = () => connectionStatus;

export const enableRideFallbackSync = () => startFallbackSync();
