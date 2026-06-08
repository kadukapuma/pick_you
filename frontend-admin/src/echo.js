import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.Pusher = Pusher;

const wsHost = import.meta.env.VITE_WS_HOST || '192.168.1.7';

const echo = new Echo({
    broadcaster: "reverb",
    key: "app-key",
    wsHost,
    wsPort: 8080,
    forceTLS: false,
    enabledTransports: ["ws"],
});

export default echo;
