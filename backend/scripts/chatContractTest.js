#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const failures = [];
const role = read("backend/middleware/roleMiddleware.js");
const socket = read("backend/sockets/messageSocket.js");
const members = read("backend/controllers/memberController.js");
const center = read("src/components/chat/MessageCenterPage.jsx");
const input = read("src/components/chat/MessageInput.jsx");
const windowFile = read("src/components/chat/ChatWindow.jsx");
const sidebar = read("src/components/chat/ChatSidebar.jsx");
for (const needle of ['authorize("member", "admin", "superadmin")']) if (!role.includes(needle)) failures.push("SuperAdmin is not authorized for HTTP chat routes.");
for (const needle of ['["member", "admin", "superadmin"]', 'join-conversation', 'call-user', 'typing', 'seen-message']) if (!socket.includes(needle)) failures.push(`Realtime chat contract missing: ${needle}`);
if (members.includes('SuperAdmin accounts do not participate in private chat')) failures.push("SuperAdmin chat was explicitly disabled.");
for (const needle of ['toast.error', 'Stale conversation id', 'API.post("/conversations"']) if (!center.includes(needle)) failures.push(`Chat center resilience missing: ${needle}`);
for (const needle of ['toast.error', '/messages/upload', 'navigator.mediaDevices', 'navigator.geolocation']) if (!input.includes(needle)) failures.push(`Chat composer resilience missing: ${needle}`);
for (const needle of ['message-seen', 'message-deleted', 'socket.emit("seen-message"', 'API.put(`/conversations/${conversation._id}/read`)']) if (!windowFile.includes(needle)) failures.push(`Chat window realtime/read contract missing: ${needle}`);
for (const needle of ['onStartConversation', 'New chat', 'onSelectConversation']) if (!sidebar.includes(needle)) failures.push(`Chat sidebar action missing: ${needle}`);
if (failures.length) { console.error("CHAT CONTRACT TEST FAILED"); failures.forEach((f) => console.error(`- ${f}`)); process.exit(1); }
console.log("CHAT CONTRACT TEST PASSED");
