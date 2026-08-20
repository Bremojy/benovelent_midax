import { createContext, useContext, useEffect } from "react";
import socket, { setSocketToken, clearSocketAuth } from "../sockets/socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, clearSession, logout } = useAuth();

  useEffect(() => {
    const token = (() => {
      try {
        const stored = JSON.parse(sessionStorage.getItem("user") || "null");
        const map = { member: "memberToken", admin: "adminToken", superadmin: "superAdminToken" };
        return stored?.role ? sessionStorage.getItem(map[String(stored.role).toLowerCase()]) : null;
      } catch { return null; }
    })();
    setSocketToken(token);

    // The socket is authenticated and should only be connected after a valid
    // portal token exists. Connecting anonymously creates noisy connect errors
    // on public/login pages and can leave stale transports during logout.
    if (!token) {
      socket.disconnect();
    }

    const handleSessionReplaced = () => {
      socket.disconnect();
      clearSession?.();
      window.dispatchEvent(new CustomEvent("benevolent:session-ended", { detail: { message: "Your account was signed in on another device. You have been logged out for security." } }));
    };
    socket.on("session-replaced", handleSessionReplaced);

    // Socket.IO is intentionally non-blocking. If Render is sleeping,
    // the rest of the dashboard must continue working over HTTP.
    if (token && !socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("session-replaced", handleSessionReplaced);
      // Keep the application-wide socket alive across portal navigation.
      // Chat/call pages subscribe/unsubscribe to their own events.
    };
  }, [user, clearSession, logout]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
