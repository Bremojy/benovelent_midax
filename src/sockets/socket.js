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
  auth: { token: "" },
  // Render deployments can accept Socket.IO polling while a WebSocket upgrade
  // is intermittently closed by the proxy. Keep polling as the stable default;
  // production can opt into websocket upgrades with VITE_SOCKET_UPGRADE=true.
  upgrade: socketUpgrade,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});

export const setSocketToken = (token) => {
  socket.auth = { token: token || "" };
  if (socket.io?.opts) socket.io.opts.query = token ? { token } : {};
};

export const clearSocketAuth = () => setSocketToken("");

socket.on("connect_error", (error) => {
  const message = String(error?.message || error || "");
  console.debug("Socket.IO connection unavailable:", message);
  if (
    message.includes("SESSION_REPLACED") ||
    message.includes("Authentication required")
  ) {
    try {
      window.dispatchEvent(
        new CustomEvent("benovelent:session-replaced")
      );
    } catch {
      // Ignore browser event failures.
    }
  }
});

socket.on("session-replaced", () => {
  try {
    window.dispatchEvent(
      new CustomEvent("benovelent:session-replaced")
    );
  } catch {
    // Ignore browser event failures.
  }
});

export default socket;
