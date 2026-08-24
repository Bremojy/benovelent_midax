import { io } from "socket.io-client";

const hostname = typeof window !== "undefined"
  ? String(window.location.hostname || "").toLowerCase()
  : "";
const isVercelHost = hostname.endsWith(".vercel.app") || hostname === "vercel.app";
const configuredSocketUrl = String(import.meta.env.VITE_SOCKET_URL || "").trim();

// Keep Socket.IO same-origin on the Vercel deployment so browser cookies/session
// semantics stay aligned with the /api proxy. Non-Vercel deployments may opt in
// to an explicit socket host through VITE_SOCKET_URL.
const SOCKET_URL = (isVercelHost
  ? (typeof window !== "undefined" ? window.location.origin : "")
  : (configuredSocketUrl || import.meta.env.VITE_API_URL || "https://benovelent-midax.onrender.com")
).replace(/\/+$/, "");

const socketUpgrade = String(import.meta.env.VITE_SOCKET_UPGRADE || "true").toLowerCase() === "true";
const socketTransports = socketUpgrade ? ["polling", "websocket"] : ["polling"];

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: socketTransports,
  withCredentials: true,
  auth: {},
  upgrade: socketUpgrade,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 8000,
  timeout: 10000,
  closeOnBeforeunload: false,
});

export const setSocketToken = () => undefined;
export const clearSocketAuth = () => undefined;

socket.on("connect_error", (error) => {
  const message = String(error?.message || error || "");
  console.debug("Socket.IO connection unavailable:", message);
  if (message.includes("SESSION_REPLACED") || message.includes("AUTH_REQUIRED") || message.includes("AUTH_INVALID")) {
    try {
      window.dispatchEvent(new CustomEvent("benovelent:session-replaced"));
    } catch {}
  }
});

socket.on("session-replaced", () => {
  try {
    window.dispatchEvent(new CustomEvent("benovelent:session-replaced"));
  } catch {}
});

export default socket;
