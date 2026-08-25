import API from "../services/api";
import { io } from "socket.io-client";

const hostname = typeof window !== "undefined" ? String(window.location.hostname || "").toLowerCase() : "";
const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(hostname);
const isVercelHost = hostname.endsWith(".vercel.app") || hostname === "vercel.app";
const configuredSocketUrl = String(import.meta.env.VITE_SOCKET_URL || "").trim();
const apiUrl = String(import.meta.env.VITE_API_URL || "").trim();

// Production REST authentication is cookie-based through the Vercel /api rewrite.
// Socket.IO connects to the Render server and receives a short-lived signed
// socket ticket from /api/auth/socket-ticket, so the Render socket never needs
// the Vercel HttpOnly cookie. WebSocket is preferred to avoid Engine.IO polling
// session affinity problems; polling remains as a fallback.
const SOCKET_URL = (
  configuredSocketUrl ||
  apiUrl ||
  (isLocalHost ? "http://localhost:5000" : (typeof window !== "undefined" ? window.location.origin : "https://benovelent-midax.onrender.com"))
).replace(/\/+$/, "");
const socketUpgrade = String(import.meta.env.VITE_SOCKET_UPGRADE || "true").toLowerCase() === "true";
let socketTicketPromise = null;

const getSocketTicket = async () => {
  if (socketTicketPromise) return socketTicketPromise;
  socketTicketPromise = API.get("/auth/socket-ticket")
    .then(({ data }) => String(data?.token || ""))
    .finally(() => { socketTicketPromise = null; });
  return socketTicketPromise;
};

const socket = io(SOCKET_URL, {
  autoConnect:false,
  transports: socketUpgrade ? ["websocket","polling"] : ["polling"],
  withCredentials: true,
  auth: async (cb) => {
    try {
      const token = await getSocketTicket();
      if (!token) throw new Error("Socket ticket missing");
      cb({ token });
    } catch (error) {
      cb({ token: "" });
      console.debug("Socket.IO auth ticket unavailable:", error?.response?.data || error?.message || error);
    }
  },
  upgrade: true,
  reconnection:true,
  reconnectionAttempts:Infinity,
  reconnectionDelay:1000,
  reconnectionDelayMax:8000,
  timeout:10000,
  closeOnBeforeunload:false,
});
export const setSocketToken = () => undefined;
export const clearSocketAuth = () => undefined;
socket.on("connect_error", (error) => {
  const message = String(error?.message || error || "");
  console.debug("Socket.IO connection unavailable:", message);
  // Socket authentication is supplementary. Do not clear the portal session
  // from a socket-only error; the REST /auth/me endpoint is authoritative.
  if (/SESSION_REPLACED|AUTH_REQUIRED|AUTH_INVALID/i.test(message)) socket.disconnect();
});
socket.on("session-replaced", () => { socket.disconnect(); });
export default socket;
