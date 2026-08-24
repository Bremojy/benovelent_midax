import { io } from "socket.io-client";

const hostname = typeof window !== "undefined" ? String(window.location.hostname || "").toLowerCase() : "";
const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(hostname);
const configuredSocketUrl = String(import.meta.env.VITE_SOCKET_URL || "").trim();
const apiUrl = String(import.meta.env.VITE_API_URL || "").trim();
const SOCKET_URL = (configuredSocketUrl || (isLocalHost ? apiUrl : (typeof window !== "undefined" ? window.location.origin : apiUrl)) || "https://benovelent-midax.onrender.com").replace(/\/+$/, "");
const socketUpgrade = String(import.meta.env.VITE_SOCKET_UPGRADE || "false").toLowerCase() === "true";
const socket = io(SOCKET_URL, { autoConnect:false, transports: socketUpgrade ? ["polling","websocket"] : ["polling"], withCredentials: true, auth:{}, upgrade:socketUpgrade, reconnection:true, reconnectionAttempts:Infinity, reconnectionDelay:1000, reconnectionDelayMax:8000, timeout:10000, closeOnBeforeunload:false });
export const setSocketToken = () => undefined;
export const clearSocketAuth = () => undefined;
socket.on("connect_error", (error) => { const message=String(error?.message||error||""); console.debug("Socket.IO connection unavailable:",message); if (message.includes("SESSION_REPLACED")||message.includes("AUTH_REQUIRED")||message.includes("AUTH_INVALID")) { try{window.dispatchEvent(new CustomEvent("benovelent:session-replaced"));}catch{} } });
socket.on("session-replaced",()=>{try{window.dispatchEvent(new CustomEvent("benovelent:session-replaced"));}catch{}});
export default socket;
