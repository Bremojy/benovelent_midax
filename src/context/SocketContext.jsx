import { createContext, useContext, useEffect } from "react";
import socket from "../sockets/socket";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  useEffect(() => {
    // Socket.IO is intentionally non-blocking. If Render is sleeping,
    // the rest of the dashboard must continue working over HTTP.
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      // Do not force-close a connection that is still handshaking.
      // Socket.IO can reconnect on the next mount/navigation.
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
