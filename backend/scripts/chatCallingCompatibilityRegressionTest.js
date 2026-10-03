"use strict";
const { read, assert, pass } = require('./testUtils');

const overlay = read('src/components/chat/CallOverlay.jsx');
const tone = read('src/utils/callTone.js');
const messageInput = read('src/components/chat/MessageInput.jsx');
const messageCenter = read('src/components/chat/MessageCenterPage.jsx');
const socket = read('backend/sockets/messageSocket.js');
const navbar = read('src/components/Navbar.jsx');

assert(/startCallTone\(incomingCall \? "incoming" : "outgoing"\)/.test(overlay), 'incoming ringtone and outgoing ringback share one duplicate-safe tone lifecycle');
assert(/VITE_CALL_RINGBACK_URL/.test(tone), 'outgoing ringback is independently configurable');
assert(!/Notification\.requestPermission/.test(messageCenter), 'Call buttons do not request notification permission');
assert(/videoFallbackAvailable/.test(overlay) && /Continue with audio/.test(overlay), 'video permission failure provides an audio-call fallback');
assert(/cameraFacingModeRef/.test(overlay) && /Flip camera/.test(overlay), 'camera switching uses media-track replacement');
assert(/getStats\(\)/.test(overlay) && /maxBitrate/.test(overlay) && /scaleResolutionDownBy/.test(overlay), 'adaptive video quality uses WebRTC statistics without renegotiating the call');
assert(/call-recover/.test(socket) && /CALL_SIGNALING_GRACE_MS/.test(socket) && /CALL_TIMEOUT_MS/.test(socket), 'server keeps call timeout and signaling grace configurable');
assert(/recipientSocketId = recipientSockets\.values\(\)\.next\(\)\.value \|\| null/.test(socket), 'multi-tab incoming calls have one realtime recipient owner');
assert(/call-mode-offer[\s\S]*}, false\)/.test(socket) && /call-mode-answer[\s\S]*}, false\)/.test(socket), 'post-answer renegotiation is routed to the exact peer socket without cross-tab broadcast');
assert(/call\.answer = answer/.test(socket) && /call-answered/.test(socket) && /call\.answer/.test(socket), 'answered SDP is persisted for caller socket recovery');
assert(/call-recovered/.test(overlay) && /attemptIceRestart/.test(overlay), 'reconnected calls can recover signaling and ICE');
assert(/supportedVoiceMimeType/.test(messageInput) && /voiceExtension/.test(messageInput), 'voice notes negotiate a supported cross-browser MediaRecorder format');
const nativeBridge = read("src/utils/nativeCallBridge.js");
const pushStore = read("src/utils/pushCallStore.js");
const iosManager = read("mobile/ios-native/IncomingCallManager.swift");
const iosPlugin = read("mobile/ios-native/BenevolentCallPlugin.swift");
const globalCenter = read("src/components/GlobalCommunicationCenter.jsx");
assert(/subscribeNativeCallEvents/.test(nativeBridge) && /callAnswered/.test(nativeBridge) && /callEnded/.test(nativeBridge), "native call bridge exposes CallKit action events");
assert(/storePendingCall/.test(pushStore) && /await storePendingCall\(callId, payload\)/.test(globalCenter), "realtime incoming calls are durably staged for native answer/decline recovery");
assert(/backendCallId/.test(iosManager) && /pendingCalls\[action\.callUUID\]/.test(iosManager), "iOS CallKit preserves the backend call ID instead of replacing it with a random UUID");
assert(/notifyListeners\("callAnswered"/.test(iosPlugin) && /notifyListeners\("callEnded"/.test(iosPlugin), "iOS CallKit answer/end actions bridge back into the web call session");
assert(/midax-home-logo-360\.webp/.test(navbar) && /midax-home-logo\.png/.test(navbar) && /fetchPriority="high"/.test(navbar), 'uploaded homepage logo is wired through optimized responsive sources');

pass('Chat calling compatibility and homepage logo regression contract passed');
