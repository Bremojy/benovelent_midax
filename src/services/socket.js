import { io } from "socket.io-client";

const socket = io(
  "https://benovelent-midax.onrender.com",
  {
    transports: ["websocket"],
    autoConnect: true,
  }
);

export default socket;