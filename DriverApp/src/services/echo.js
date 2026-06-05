import AsyncStorage from "@react-native-async-storage/async-storage";

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

/**
 * Reuse one Pusher connection for the whole session (faster ride popups).
 */
const createEchoInstance = async () => {
  if (cachedEcho && cachedPusher) {
    return { echo: cachedEcho, pusher: cachedPusher };
  }

  await AsyncStorage.getItem("userToken");

  const PusherModule = require("pusher-js/react-native");
  const PusherConstructor =
    PusherModule.Pusher || PusherModule.default || PusherModule;

  const wsHost = process.env.EXPO_PUBLIC_WS_HOST || "192.168.1.7";
  const wsPort = Number(process.env.EXPO_PUBLIC_WS_PORT || 8080);
  const wsScheme = process.env.EXPO_PUBLIC_WS_SCHEME || "http";
  const appKey = process.env.EXPO_PUBLIC_REVERB_APP_KEY || "app-key";
  const wsCluster = process.env.EXPO_PUBLIC_PUSHER_CLUSTER || "mt1";

  const pusher = new PusherConstructor(appKey, {
    wsHost,
    wsPort,
    wssPort: wsPort,
    cluster: wsCluster,
    forceTLS: wsScheme === "https",
    enabledTransports: ["ws", "wss"],
    disableStats: true,
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
