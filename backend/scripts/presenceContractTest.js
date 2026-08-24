const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const mustContain = (file, values) => {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const value of values) {
    if (!text.includes(value)) throw new Error(`${file} is missing required presence behaviour: ${value}`);
  }
};

mustContain("backend/sockets/onlineUsers.js", ["PRESENCE_TIMEOUT_MS", "touchUser", "cleanupStale", "lastHeartbeat"]);
mustContain("backend/sockets/messageSocket.js", ["presence-heartbeat", "presence-required", "ensurePresenceCleanup"]);
mustContain("src/context/SocketContext.jsx", ["presence-heartbeat", "setInterval"]);
mustContain("src/components/chat/ChatHeader.jsx", ["active secure chat connection", "Online now"]);
console.log("Presence contract test: PASS");
