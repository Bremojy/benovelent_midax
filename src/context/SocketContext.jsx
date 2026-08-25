import { createContext, useContext, useEffect, useRef } from "react";
import socket, { clearSocketAuth } from "../sockets/socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const loginInProgressRef = useRef(false);

  useEffect(() => {
    let heartbeatTimer = null;

    const handleLoginStart = () => {
      loginInProgressRef.current = true;
      stopPresence();
      socket.disconnect();
    };

    const handleLoginComplete = () => {
      loginInProgressRef.current = false;
      if (user && !socket.connected) socket.connect();
    };

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
      // A socket can briefly hold an old ticket while the browser is switching
      // accounts. Disconnect it and let REST /auth/me determine whether the
      // actual portal session is still valid.
      stopPresence();
      socket.disconnect();
      if (!loginInProgressRef.current) window.setTimeout(() => { if (user && !socket.connected) socket.connect(); }, 250);
    };

    const handlePresenceRequired = () => announcePresence();

    window.addEventListener("benevolent:auth-login-start", handleLoginStart);
    window.addEventListener("benevolent:auth-login-complete", handleLoginComplete);
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
      window.removeEventListener("benevolent:auth-login-start", handleLoginStart);
      window.removeEventListener("benevolent:auth-login-complete", handleLoginComplete);
      socket.off("session-replaced", handleSessionReplaced);
      socket.off("connect", announcePresence);
      socket.off("presence-required", handlePresenceRequired);
    };
  }, [user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
