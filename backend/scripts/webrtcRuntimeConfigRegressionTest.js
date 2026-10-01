"use strict";
const { read, assert, pass } = require('./testUtils');

const authController = read('backend/controllers/authController.js');
const authRoutes = read('backend/routes/authRoutes.js');
const overlay = read('src/components/chat/CallOverlay.jsx');
const rootEnv = read('.env.example');
const backendEnv = read('backend/.env.example');

assert(/exports\.webrtcConfig = async/.test(authController), 'backend exposes a runtime WebRTC configuration handler');
assert(/TURN_SERVER_URL/.test(authController) && /TURN_USERNAME/.test(authController) && /TURN_CREDENTIAL/.test(authController), 'TURN settings are read server-side');
assert(/private, no-store/.test(authController), 'runtime ICE configuration is not publicly cacheable');
assert(/router\.get\("\/webrtc-config", protect, isChatUser, authController\.webrtcConfig\)/.test(authRoutes), 'only authenticated Member/Admin chat users can request runtime ICE configuration');
assert(/API\.get\("\/auth\/webrtc-config"\)/.test(overlay), 'browser fetches runtime ICE configuration through the protected API');
assert(/new RTCPeerConnection\(\{ iceServers: iceServersRef\.current \}\)/.test(overlay), 'peer connections use the runtime ICE configuration');
assert(!/VITE_TURN_SERVER_URL|VITE_TURN_USERNAME|VITE_TURN_CREDENTIAL/.test(overlay), 'TURN credentials are not referenced from browser-bundled VITE environment variables');
assert(!/VITE_TURN_SERVER_URL|VITE_TURN_USERNAME|VITE_TURN_CREDENTIAL/.test(rootEnv), 'frontend environment example contains no browser-bundled TURN credentials');
assert(/TURN_SERVER_URL=/.test(backendEnv) && /TURN_USERNAME=/.test(backendEnv) && /TURN_CREDENTIAL=/.test(backendEnv), 'backend environment example documents server-side TURN settings');

pass('WebRTC runtime ICE configuration regression contract passed');
