#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const socket = read("backend/sockets/messageSocket.js");
const overlay = read("src/components/chat/CallOverlay.jsx");
const center = read("src/components/chat/MessageCenterPage.jsx");
const tone = read("src/utils/callTone.js");
const sw = read("public/sw.js");
const tonePath = path.join(root, "public/sounds/benovelent-call.mp3");

for (const [label, source, needles] of [
  ["socket call flow", socket, [
    'socket.on("call-user"',
    'const recipientSockets = new Set()',
    'recipientSockets.forEach((socketId) => io.to(socketId).emit("incoming-call"',
    'recipientSockets.forEach((socketId) => io.to(socketId).emit("new-call-notification"',
    'socket.on("call-answer"',
    'socket.on("call-rejected"',
    'socket.on("end-call"',
  ]],
  ["browser call overlay", overlay, [
    "startCallTone",
    "stopNativeIncomingCall",
    "getUserMedia",
    "new RTCPeerConnection",
  ]],
  ["message center", center, [
    'activeSocket.on("incoming-call", handleIncomingCall)',
    'startNativeIncomingCall',
    'onAudioCall={() => startCall("audio")}',
    'onVideoCall={() => startCall("video")}',
    'action === "decline"',
    'incomingPushCall',
    'incomingNativeCall',
    'autoAccept={Boolean(call.autoAccept)}',
  ]],
  ["ringtone utility", tone, [
    '/sounds/benovelent-call.mp3',
    'audio.loop = true',
    'VITE_CALL_RINGTONE_URL',
  ]],
  ["push service worker", sw, [
    "incoming_call",
    "actions: isIncomingCall",
    'callAction=${encodeURIComponent(action)}',
  ]],
]) {
  for (const needle of needles) if (!source.includes(needle)) failures.push(`${label}: missing ${needle}`);
}
if (!fs.existsSync(tonePath) || fs.statSync(tonePath).size < 100) failures.push("Customized Benevolent call ringtone file is missing or empty.");

if (failures.length) {
  console.error("CALL FLOW CONTRACT TEST FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("CALL FLOW CONTRACT TEST PASSED");
console.log("Verified browser audio/video signalling, incoming-call notifications, push actions, native bridge hooks and customized ringtone.");
