import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./api";

let cachedPusher = null;
let cachedEcho = null;

const wrapChannel = (pusherChannel) => ({
  listen(event, callback) {
    const eventName = event.startsWith(".") ? event.slice(1) : event;
    if (typeof pusherChannel.bind === "function") {
      pusherChannel.bind(eventName, callback);
    } else if (pusherChannel.emitter?.bind) {
      pusherChannel.emitter.bind(eventName, callback);
    }
    return this;
  },

  unbind(event, callback) {
    const eventName = event.startsWith(".") ? event.slice(1) : event;
    if (typeof pusherChannel.unbind === "function") {
      pusherChannel.unbind(eventName, callback);
    } else if (pusherChannel.emitter?.unbind) {
      pusherChannel.emitter.unbind(eventName, callback);
    }
    return this;
  },
});

const buildEchoWrapper = (pusher) => ({
  channels: {},

  channel(channelName) {
    if (!this.channels[channelName]) {
      const pusherChannel = pusher.subscribe(channelName);
      this.channels[channelName] = wrapChannel(pusherChannel);
    }
    return this.channels[channelName];
  },

  private(channelName) {
    return this.channel(`private-${channelName}`);
  },

  leaveChannel(channelName) {
    if (this.channels[channelName]) {
      pusher.unsubscribe(channelName);
      delete this.channels[channelName];
    }
  },

  leave(channelName) {
    this.leaveChannel(channelName);
  },
});

const authorizeChannel = async ({ socketId, channelName }, callback) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    const response = await fetch(`${API_BASE_URL}/broadcasting/auth`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        socket_id: socketId,
        channel_name: channelName,
      }),
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = null;
    }

    if (!response.ok) {
      const message =
        data?.message || `Broadcast auth failed with HTTP ${response.status}`;
      callback(new Error(message), null);
      return;
    }

    callback(null, data);
  } catch (error) {
    callback(error, null);
  }
};

/**
 * Reuse one Pusher connection for the whole session (faster ride popups).
 */
const createEchoInstance = async () => {
  if (cachedEcho && cachedPusher) {
    return { echo: cachedEcho, pusher: cachedPusher };
  }

  const PusherModule = require("pusher-js/react-native");
  const PusherConstructor =
    PusherModule.Pusher || PusherModule.default || PusherModule;

  const wsHost = process.env.EXPO_PUBLIC_WS_HOST || "picku.lk";
  const wsPort = Number(process.env.EXPO_PUBLIC_WS_PORT || 443);
  const wsScheme = (process.env.EXPO_PUBLIC_WS_SCHEME || "https").toLowerCase();
  const appKey = process.env.EXPO_PUBLIC_REVERB_APP_KEY || "app-key";
  const wsCluster = process.env.EXPO_PUBLIC_PUSHER_CLUSTER || "mt1";
  const forceTLS = wsScheme === "https" || wsScheme === "wss";

  if (__DEV__ && appKey === "app-key") {
    console.warn(
      "Reverb app key is still the sample value. Set EXPO_PUBLIC_REVERB_APP_KEY to match the backend.",
    );
  }

  const pusher = new PusherConstructor(appKey, {
    wsHost,
    wsPort,
    wssPort: wsPort,
    cluster: wsCluster,
    forceTLS,
    encrypted: forceTLS,
    enabledTransports: ["ws", "wss"],
    enableStats: false,
    channelAuthorization: {
      customHandler: authorizeChannel,
    },
  });

  cachedPusher = pusher;
  cachedEcho = buildEchoWrapper(pusher);

  return { echo: cachedEcho, pusher: cachedPusher };
};

export const destroyEchoInstance = () => {
  if (cachedPusher) {
    try {
      cachedPusher.disconnect();
    } catch (_) {
      /* ignore */
    }
  }
  cachedPusher = null;
  cachedEcho = null;
};

export default createEchoInstance;
