import AsyncStorage from "@react-native-async-storage/async-storage";

const createEchoInstance = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");

    console.log("Requiring Pusher...");
    const PusherModule = require("pusher-js/react-native");
    
    // Fallback logic to grab the correct constructor regardless of build bundler quirks
    const PusherConstructor = PusherModule.Pusher || PusherModule.default || PusherModule;

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
          
          // Safe resolution: Direct method check vs internal emitter routing
          if (typeof pusherChannel.bind === 'function') {
            pusherChannel.bind(eventName, callback);
          } else if (pusherChannel.emitter && typeof pusherChannel.emitter.bind === 'function') {
            pusherChannel.emitter.bind(eventName, callback);
          } else {
            console.warn(`Could not bind to event ${eventName}: Bind method missing on channel structural type.`);
          }
          return this;
        },

        unbind(event, callback) {
          console.log("Unbinding event:", event);
          const eventName = event.startsWith('.') ? event : '.' + event;
          
          if (typeof pusherChannel.unbind === 'function') {
            pusherChannel.unbind(eventName, callback);
          } else if (pusherChannel.emitter && typeof pusherChannel.emitter.unbind === 'function') {
            pusherChannel.emitter.unbind(eventName, callback);
          }
          return this;
        }
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