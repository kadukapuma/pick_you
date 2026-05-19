import AsyncStorage from "@react-native-async-storage/async-storage";

const createEchoInstance = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");

    console.log("Requiring Pusher...");

    const Pusher = require("pusher-js/react-native");
    const PusherConstructor = Pusher.Pusher;

    console.log("Creating Pusher instance with config...");

    // Create Pusher instance with proper config
    const pusher = new PusherConstructor("app-key", {
      cluster: "mt1",
      forceTLS: false,
    });

    console.log("Pusher instance created successfully");

    // Wrapper for Pusher channel to provide Echo-like API
    const wrapChannel = (pusherChannel) => {
      return {
        listen(event, callback) {
          console.log("Listening for event:", event);
          // Pusher events start with '.' so add it if not present
          const eventName = event.startsWith('.') ? event : '.' + event;
          pusherChannel.bind(eventName, callback);
          return this;
        },

        unbind(event, callback) {
          const eventName = event.startsWith('.') ? event : '.' + event;
          pusherChannel.unbind(eventName, callback);
          return this;
        },

        // Pass through other methods
        bind: pusherChannel.bind.bind(pusherChannel),
        unbind: pusherChannel.unbind.bind(pusherChannel),
        subscribe: pusherChannel.subscribe.bind(pusherChannel),
        unsubscribe: pusherChannel.unsubscribe.bind(pusherChannel),
      };
    };

    // Return an object that mimics the Echo API
    const echoInstance = {
      channels: {},

      channel(channelName) {
        console.log("Subscribing to channel:", channelName);
        if (!this.channels[channelName]) {
          const pusherChannel = pusher.subscribe(channelName);
          this.channels[channelName] = wrapChannel(pusherChannel);
        }
        return this.channels[channelName];
      },

      leaveChannel(channelName) {
        console.log("Leaving channel:", channelName);
        if (this.channels[channelName]) {
          pusher.unsubscribe(channelName);
          delete this.channels[channelName];
        }
      },

      leave(channelName) {
        this.leaveChannel(channelName);
      }
    };

    console.log("Echo instance created successfully");
    return echoInstance;
  } catch (error) {
    console.error("Failed to create Echo instance:", error.message || error);
    throw error;
  }
};

export default createEchoInstance;
