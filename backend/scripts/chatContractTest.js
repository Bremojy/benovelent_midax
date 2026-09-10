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
const header = read("src/components/chat/ChatHeader.jsx");
const routes = read("backend/routes/conversationRoutes.js");
const chatProfile = read("backend/utils/chatProfile.js");
if (!role.includes('const isChatUser = authorize("member", "admin");')) failures.push("HTTP chat routes must be restricted to members and admins.");
for (const needle of ['join-conversation', 'call-user', 'typing', 'seen-message']) if (!socket.includes(needle)) failures.push(`Realtime chat contract missing: ${needle}`);
if (!chatProfile.includes("const CHAT_ROLES = new Set(['member', 'admin'])")) failures.push("Canonical chat role policy must be member/admin only.");
if (socket.includes('["member", "admin", "superadmin"]')) failures.push("Socket chat role list still grants SuperAdmin access.");
for (const needle of ['toast.error', 'Stale conversation id', 'API.post("/conversations"']) if (!center.includes(needle)) failures.push(`Chat center resilience missing: ${needle}`);
for (const needle of ['toast.error', '/messages/upload', 'navigator.mediaDevices', 'navigator.geolocation']) if (!input.includes(needle)) failures.push(`Chat composer resilience missing: ${needle}`);
for (const needle of ['message-seen', 'message-deleted', 'socket.emit("seen-message"', 'API.put(`/conversations/${conversation._id}/read`)']) if (!windowFile.includes(needle)) failures.push(`Chat window realtime/read contract missing: ${needle}`);
for (const needle of ['onStartConversation', 'New chat', 'onSelectConversation']) if (!sidebar.includes(needle)) failures.push(`Chat sidebar action missing: ${needle}`);
for (const needle of ['/:id/pin', '/:id/mute']) if (!routes.includes(needle)) failures.push(`Conversation action route missing: ${needle}`);
for (const needle of ['onProfile', 'Conversation details']) if (!header.includes(needle)) failures.push(`Chat header action missing: ${needle}`);
if (failures.length) { console.error("CHAT CONTRACT TEST FAILED"); failures.forEach((f) => console.error(`- ${f}`)); process.exit(1); }
console.log("CHAT CONTRACT TEST PASSED");
