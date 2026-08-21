import { createContext, useContext, useEffect } from "react";
import socket, { clearSocketAuth } from "../sockets/socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, clearSession } = useAuth();

  useEffect(() => {
    const handleSessionReplaced = () => {
      socket.disconnect();
      clearSession?.();
      window.dispatchEvent(new CustomEvent("benevolent:session-ended", {
        detail: { message: "Your account was signed in on another device. You have been logged out for security." },
      }));
    };

    socket.on("session-replaced", handleSessionReplaced);

    if (!user) {
      clearSocketAuth();
      socket.disconnect();
    } else if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("session-replaced", handleSessionReplaced);
    };
  }, [user, clearSession]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
