import { createContext, useContext, useEffect } from "react";
import socket, { setSocketToken, clearSocketAuth } from "../sockets/socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, clearSession, logout } = useAuth();

  useEffect(() => {
    const token = (() => {
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "null");
        const map = { member: "memberToken", admin: "adminToken", superadmin: "superAdminToken" };
        return stored?.role ? localStorage.getItem(map[String(stored.role).toLowerCase()]) : null;
      } catch { return null; }
    })();
    setSocketToken(token);
    const handleSessionReplaced = () => {
      socket.disconnect();
      clearSession?.();
      window.dispatchEvent(new CustomEvent("benevolent:session-ended", { detail: { message: "Your account was signed in on another device. You have been logged out for security." } }));
    };
    socket.on("session-replaced", handleSessionReplaced);

    // Socket.IO is intentionally non-blocking. If Render is sleeping,
    // the rest of the dashboard must continue working over HTTP.
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      // Do not force-close a connection that is still handshaking.
      // Socket.IO can reconnect on the next mount/navigation.
      socket.off("session-replaced", handleSessionReplaced);
      if (socket.connected) { socket.disconnect(); }
      clearSocketAuth();
    };
  }, [user, clearSession, logout]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
