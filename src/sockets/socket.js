import { io } from "socket.io-client";

const SOCKET_URL = String(
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "https://benovelent-midax.onrender.com"
).replace(/\/+$/, "");

const socketUpgrade = String(import.meta.env.VITE_SOCKET_UPGRADE || "false").toLowerCase() === "true";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["polling", "websocket"],
  withCredentials: true,
  auth: {},
  upgrade: socketUpgrade,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});

// Retained as no-op compatibility exports for older components/mobile bridges.
// Browser authentication now travels only in the HttpOnly cookie.
export const setSocketToken = () => undefined;
export const clearSocketAuth = () => undefined;

socket.on("connect_error", (error) => {
  const message = String(error?.message || error || "");
  console.debug("Socket.IO connection unavailable:", message);
  if (message.includes("SESSION_REPLACED") || message.includes("AUTH_REQUIRED") || message.includes("AUTH_INVALID")) {
    try {
      window.dispatchEvent(new CustomEvent("benovelent:session-replaced"));
    } catch {
      // Ignore browser event failures.
    }
  }
});

socket.on("session-replaced", () => {
  try {
    window.dispatchEvent(new CustomEvent("benovelent:session-replaced"));
  } catch {
    // Ignore browser event failures.
  }
});

export default socket;
