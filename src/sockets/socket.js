import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "https://benovelent-midax.onrender.com";

// Start with HTTP long-polling and let Socket.IO upgrade to WebSocket.
// This is more reliable with Render cold starts/proxies than forcing
// WebSocket as the only transport.
const getRoleToken = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = String(user?.role || "").toLowerCase();
    const key = role === "superadmin" ? "superAdminToken" : role === "admin" ? "adminToken" : "memberToken";
    return key ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["polling", "websocket"],
  auth: { get token() { return getRoleToken(); } },
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1500,
  timeout: 10000,
});

socket.on("connect_error", (error) => {
  // HTTP APIs remain usable when Render is waking or a WebSocket upgrade is unavailable.
  console.debug("Socket.IO connection unavailable:", error?.message || error);
  if (String(error?.message || "").includes("SESSION_REPLACED")) {
    try { window.dispatchEvent(new CustomEvent("benovelent:session-replaced")); } catch {}
  }
});

// The server can invalidate this device immediately when the same account logs in
// elsewhere. Portal auth listens for this event and clears local credentials.
socket.on("session-replaced", () => {
  try { window.dispatchEvent(new CustomEvent("benovelent:session-replaced")); } catch {}
});

export default socket;
