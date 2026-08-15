import { io } from "socket.io-client";

const SOCKET_URL = String(import.meta.env.VITE_API_URL || "https://benovelent-midax.onrender.com").replace(/\/+$/, "");

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 800,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});

export default socket;
