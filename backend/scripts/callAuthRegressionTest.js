#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const overlay = read("src/components/chat/CallOverlay.jsx");
const center = read("src/components/chat/MessageCenterPage.jsx");
const socket = read("backend/sockets/messageSocket.js");
const auth = read("src/context/AuthContext.jsx");
const sw = read("public/sw.js");
const message = read("backend/models/Message.js");
const assistant = read("src/components/SmartAssistant.jsx");

for (const needle of ["call-mode-offer", "call-mode-answer", "RING_TIMEOUT_SECONDS", "toggleCallMode", "autoAccept"]) {
  if (!overlay.includes(needle)) failures.push(`CallOverlay missing: ${needle}`);
}
for (const needle of ["incomingNativeCall", "incomingPushCall", "callAction", "autoAccept={Boolean(call.autoAccept)}"]) {
  if (!center.includes(needle)) failures.push(`MessageCenter native/push action missing: ${needle}`);
}
for (const needle of ["CALL_TIMEOUT_MS", "recordCallSummary", "call-mode-offer", "call-mode-answer", "call-ended", "answeredAt"]) {
  if (!socket.includes(needle)) failures.push(`Backend call lifecycle missing: ${needle}`);
}
for (const needle of ["ACTIVE_ACCOUNT_KEY", "localStorage", "BroadcastChannel", "Another account was signed in on this device"]) {
  if (!auth.includes(needle)) failures.push(`Single-account browser session missing: ${needle}`);
}
for (const needle of ["incoming_call", "silent: false", "requireInteraction", "actions", "answer", "decline"]) {
  if (!sw.includes(needle)) failures.push(`Push call notification missing: ${needle}`);
}
for (const needle of ['"call"', "callType", "callStatus", "callDurationSeconds"]) {
  if (!message.includes(needle)) failures.push(`Call history schema missing: ${needle}`);
}
if (!assistant.includes("same device") || !assistant.includes("Feedback")) failures.push("Assistant knowledge base is missing core account/feedback guidance.");

if (fs.existsSync(path.join(root, "backend/src"))) failures.push("Duplicate backend/src frontend mirror still exists.");
if (fs.existsSync(path.join(root, "backend/mobile/android-native/app/src/main/java/ke/co/midax/benovelent/calls/IncomingCallNotifier.kt"))) failures.push("Duplicate legacy Android notifier still exists.");

if (failures.length) {
  console.error("CALL/AUTH REGRESSION TEST FAILED");
  failures.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log("CALL/AUTH REGRESSION TEST PASSED");
