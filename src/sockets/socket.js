import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "https://benovelent-midax.onrender.com";

// Start with HTTP long-polling and let Socket.IO upgrade to WebSocket.
// This is more reliable with Render cold starts/proxies than forcing
// WebSocket as the only transport.
const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["polling", "websocket"],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1500,
  timeout: 10000,
});

export default socket;
