"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const checks = [];

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}
function check(name, condition, detail) {
  checks.push({ name, pass: Boolean(condition), detail });
}

const socket = read("backend/sockets/messageSocket.js");
const socketAuth = read("backend/sockets/socket.js");
const overlay = read("src/components/chat/CallOverlay.jsx");
const auth = read("backend/controllers/authController.js");
const authRoutes = read("backend/routes/authRoutes.js");
const env = read("backend/.env.example");

check("server-side call id", /crypto\.randomUUID\(\)/.test(socket), "callId is authoritative and generated on the backend");
check("authenticated socket", /jwt\.verify/.test(socketAuth) && /sessionVersion/.test(socketAuth) && /resolveCanonicalChatActorForAuthenticatedUser/.test(socketAuth), "socket identity is authenticated and canonicalized");
check("authorized call conversation", /deletedFor: \{ \$ne: socket\.data\.chatId \}/.test(socket), "deleted viewer state is not callable");
check("runtime ICE config", /router\.get\("\/webrtc-config", protect, isChatUser/.test(authRoutes) && /TURN_SERVER_URL/.test(auth) && /TURN_USERNAME/.test(auth) && /TURN_CREDENTIAL/.test(auth), "TURN config stays server-side behind authenticated API");
check("early ICE buffering", /pendingOutgoingCandidatesRef/.test(overlay) && /if \(!activeId\)/.test(overlay) && /flushOutgoingCandidates/.test(overlay), "caller buffers candidates until callId exists");
check("remote media", /peer\.ontrack/.test(overlay) && /remoteAudioRef\.current\.srcObject = stream/.test(overlay) && /remoteVideoRef\.current\.srcObject = stream/.test(overlay), "remote tracks attach to real media elements");
check("audio playback recovery", /ensureRemoteAudioPlayback/.test(overlay) && /Enable call audio/.test(overlay), "autoplay-blocked audio has a user recovery path");
check("ICE restart", /iceRestart: true/.test(overlay) && /Reconnecting/.test(overlay), "disconnected/failed ICE states attempt recovery before ending");
check("media cleanup", /peerRef\.current\?\.close\(\)/.test(overlay) && /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/.test(overlay), "peer and local tracks are cleaned up");
check("single-instance topology", /SOCKET_STATE_TOPOLOGY=single-instance/.test(env), "active call state has an explicit safe deployment topology");

const failed = checks.filter((item) => !item.pass);
checks.forEach((item) => console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name} — ${item.detail}`));
console.log(`\nCalling diagnostic: ${checks.length - failed.length}/${checks.length} checks passed.`);
process.exitCode = failed.length ? 1 : 0;
