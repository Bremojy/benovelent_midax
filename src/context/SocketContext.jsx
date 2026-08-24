import { createContext, useContext, useEffect } from "react";
import socket, { clearSocketAuth } from "../sockets/socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, clearSession } = useAuth();

  useEffect(() => {
    let heartbeatTimer = null;

    const stopPresence = () => {
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const announcePresence = () => {
      if (!socket.connected) return;
      socket.emit("user-online", {
        userId: user?._id || user?.id,
        role: user?.role || "member",
      });
      socket.emit("presence-heartbeat");
      stopPresence();
      heartbeatTimer = window.setInterval(() => {
        if (socket.connected) socket.emit("presence-heartbeat");
      }, 20000);
    };

    const handleSessionReplaced = () => {
      stopPresence();
      socket.disconnect();
      clearSession?.();
      window.dispatchEvent(new CustomEvent("benevolent:session-ended", {
        detail: { message: "Your account was signed in on another device. You have been logged out for security." },
      }));
    };

    const handlePresenceRequired = () => announcePresence();

    socket.on("session-replaced", handleSessionReplaced);
    socket.on("connect", announcePresence);
    socket.on("presence-required", handlePresenceRequired);

    if (!user) {
      stopPresence();
      clearSocketAuth();
      socket.disconnect();
    } else if (!socket.connected) {
      socket.connect();
    } else {
      announcePresence();
    }

    return () => {
      stopPresence();
      socket.off("session-replaced", handleSessionReplaced);
      socket.off("connect", announcePresence);
      socket.off("presence-required", handlePresenceRequired);
    };
  }, [user, clearSession]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
