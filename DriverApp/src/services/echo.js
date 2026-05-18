import Echo from "laravel-echo";
import Pusher from "pusher-js/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Important for React Native
window.Pusher = Pusher;

const createEchoInstance = async () => {
  const token = await AsyncStorage.getItem("userToken");

  const EchoConstructor = (typeof Echo === 'function')
    ? Echo
    : (Echo.Echo || Echo.default || Echo);

  if (typeof EchoConstructor !== 'function') {
    throw new Error('Echo constructor not found');
  }

  return new EchoConstructor({
    broadcaster: "reverb",
    key: "app-key", // From .env REVERB_APP_KEY
    wsHost: "192.168.1.6", // Change to your local IP
    wsPort: 8080,
    forceTLS: false,
    disableStats: true,
    enabledTransports: ["ws", "wss"],
    authEndpoint: "http://192.168.1.6:8000/api/broadcasting/auth",
    auth: {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  });
};

export default createEchoInstance;
