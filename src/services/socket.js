import { io } from "socket.io-client";

const socket = io(
  import.meta.env.VITE_API_URL || "https://benovelent-midax.onrender.com",
  {
    transports: ["websocket"],
    autoConnect: true,
  }
);

export default socket;