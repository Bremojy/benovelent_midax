import API from "../services/api";
import { io } from "socket.io-client";

const hostname = typeof window !== "undefined" ? String(window.location.hostname || "").toLowerCase() : "";
const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(hostname);
const isVercelHost = hostname.endsWith(".vercel.app") || hostname === "vercel.app";
const configuredSocketUrl = String(import.meta.env.VITE_SOCKET_URL || "").trim();
const apiUrl = String(import.meta.env.VITE_API_URL || "").trim();

// Production authentication is cookie-based. On Vercel, keep Socket.IO
// same-origin so the browser can send the same HttpOnly session cookie used
// by the /api Vercel rewrite. Polling remains the default because it works
// through the proxy without relying on a WebSocket upgrade at the edge.
const SOCKET_URL = (
  configuredSocketUrl ||
  apiUrl ||
  (isLocalHost ? "http://localhost:5000" : (typeof window !== "undefined" ? window.location.origin : "https://benovelent-midax.onrender.com"))
).replace(/\/+$/, "");
const socketUpgrade = String(import.meta.env.VITE_SOCKET_UPGRADE || "false").toLowerCase() === "true";
const socket = io(SOCKET_URL, {
  autoConnect:false,
  transports: socketUpgrade ? ["polling","websocket"] : ["polling"],
  withCredentials: true,
  auth: async (cb) => {
    try {
      const { data } = await API.get("/auth/socket-ticket");
      cb({ token: String(data?.token || "") });
    } catch (error) {
      cb({ token: "" });
      console.debug("Socket.IO auth ticket unavailable:", error?.response?.data || error?.message || error);
    }
  },
  upgrade:socketUpgrade,
  reconnection:true,
  reconnectionAttempts:Infinity,
  reconnectionDelay:1000,
  reconnectionDelayMax:8000,
  timeout:10000,
  closeOnBeforeunload:false,
});
export const setSocketToken = () => undefined;
export const clearSocketAuth = () => undefined;
socket.on("connect_error", (error) => { const message=String(error?.message||error||""); console.debug("Socket.IO connection unavailable:",message); if (message.includes("SESSION_REPLACED")||message.includes("AUTH_REQUIRED")||message.includes("AUTH_INVALID")) { try{window.dispatchEvent(new CustomEvent("benovelent:session-replaced"));}catch{} } });
socket.on("session-replaced",()=>{try{window.dispatchEvent(new CustomEvent("benovelent:session-replaced"));}catch{}});
export default socket;
