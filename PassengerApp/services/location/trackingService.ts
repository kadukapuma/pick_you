import PusherModule from "pusher-js/react-native";
import { API_CONFIG } from "../api/config";
import { apiClient } from "../api/apiClient";
import { StorageService } from "../auth/storageService";

export interface DriverLocationUpdate {
  ride_id: number;
  driver_id: number;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy: number | null;
  recorded_at: string;
  sequence: number;
  is_stale?: boolean;
  vehicle_type?: string;
}

export interface TrackingStatus {
  connected: boolean;
  stale: boolean;
}

export interface RideStatusUpdate {
  ride: any;
}

const STALE_AFTER_MS = 20_000;
const FALLBACK_POLL_MS = 10_000;

const PusherConstructor =
  ((PusherModule as any).Pusher ||
    (PusherModule as any).default ||
    PusherModule) as any;

export async function subscribeToRideLocation(
  rideId: number,
  onLocation: (location: DriverLocationUpdate) => void,
  onStatus?: (status: TrackingStatus) => void,
  onRideUpdate?: (ride: any) => void,
): Promise<() => void> {
  let lastSequence = 0;
  let lastUpdateAt = 0;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let staleTimer: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const emitStatus = (connected: boolean) => {
    onStatus?.({
      connected,
      stale: !lastUpdateAt || Date.now() - lastUpdateAt > STALE_AFTER_MS,
    });
  };

  const acceptLocation = (raw: DriverLocationUpdate | { data: DriverLocationUpdate }) => {
    const location = "data" in raw ? raw.data : raw;
    if (!location || Number(location.sequence || 0) < lastSequence) return;

    lastSequence = Number(location.sequence || Date.now());
    lastUpdateAt = Date.parse(location.recorded_at) || Date.now();
    onLocation({
      ...location,
      ride_id: Number(location.ride_id),
      driver_id: Number(location.driver_id),
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      heading: Number(location.heading || 0),
      speed: Number(location.speed || 0),
      accuracy:
        location.accuracy === null || location.accuracy === undefined
          ? null
          : Number(location.accuracy),
      sequence: Number(location.sequence || Date.now()),
    });
  };

  const fetchSnapshot = async () => {
    const response = await apiClient.get<DriverLocationUpdate>(
      `/rides/${rideId}/driver-location`,
      { suppressErrorLog: true },
    );
    if (response.success && response.data) acceptLocation(response.data);
    emitStatus(false);
  };

  const startPolling = () => {
    if (pollTimer || closed) return;
    fetchSnapshot();
    pollTimer = setInterval(fetchSnapshot, FALLBACK_POLL_MS);
  };

  const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  };

  fetchSnapshot();
  const token = await StorageService.getToken();
  const wsHost = process.env.EXPO_PUBLIC_WS_HOST || "picku.lk";
  const wsPort = Number(process.env.EXPO_PUBLIC_WS_PORT || 443);
  const wsScheme = (process.env.EXPO_PUBLIC_WS_SCHEME || "https").toLowerCase();
  const appKey = process.env.EXPO_PUBLIC_REVERB_APP_KEY || "app-key";
  const forceTLS = wsScheme === "https" || wsScheme === "wss";

  const pusher = new PusherConstructor(appKey, {
    wsHost,
    wsPort,
    wssPort: wsPort,
    cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || "mt1",
    forceTLS,
    encrypted: forceTLS,
    enabledTransports: ["ws", "wss"],
    disableStats: true,
    authEndpoint: `${API_CONFIG.BASE_URL}/broadcasting/auth`,
    auth: {
      headers: {
        Accept: "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  });

  const channelName = `private-ride.${rideId}`;
  const channel = pusher.subscribe(channelName);
  channel.bind("DriverLocationUpdated", acceptLocation);
  channel.bind("RideStatusUpdated", (raw: RideStatusUpdate | { data: RideStatusUpdate }) => {
    const payload = "data" in raw ? raw.data : raw;
    if (payload?.ride) onRideUpdate?.(payload.ride);
  });

  pusher.connection.bind("connected", () => {
    stopPolling();
    emitStatus(true);
  });
  pusher.connection.bind("disconnected", () => {
    emitStatus(false);
    startPolling();
  });
  pusher.connection.bind("error", () => {
    emitStatus(false);
    startPolling();
  });

  staleTimer = setInterval(
    () => emitStatus(pusher.connection.state === "connected"),
    2000,
  );
  if (pusher.connection.state !== "connected") startPolling();

  return () => {
    closed = true;
    stopPolling();
    if (staleTimer) clearInterval(staleTimer);
    channel.unbind("DriverLocationUpdated", acceptLocation);
    channel.unbind("RideStatusUpdated");
    pusher.unsubscribe(channelName);
    pusher.disconnect();
  };
}
