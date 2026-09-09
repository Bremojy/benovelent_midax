# Benevolent MIDAX — Chat Rebuild / Hardening Audit
Date: 2026-09-09

## Scope
Rebuild and harden the existing Member/Admin chat system without replacing the architecture. SuperAdmin chat remains restricted according to the existing role policy.

## Key fixes
1. Fixed WebRTC ICE candidate signaling so outgoing candidates use the live server-assigned `callId` rather than the initial empty React state value.
2. Added guarded call termination/rejection to prevent duplicate end/reject signaling during timeout, remote hang-up, and socket events.
3. Added realtime disconnect visibility in the call overlay.
4. Removed duplicate browser Notification API delivery for the `new-call-notification` UI event; backend push/notification delivery remains authoritative.
5. Added secure conversation `pin` and `mute` routes and hardened conversation mutations to use the canonical authenticated chat identity.
6. Added a functional conversation-details panel in ChatWindow with pin/unpin, mute/unmute, and remove-conversation actions.
7. Added a real delete callback so removing a conversation immediately updates desktop and mobile chat state.
8. Removed a duplicate `type="button"` attribute in the chat sidebar.
9. Strengthened chat contract tests to cover conversation actions and the profile/details action.

## Existing functionality preserved
- Member/Admin messaging
- optimistic sends and idempotency
- attachments and voice notes
- typing indicators
- read receipts
- presence/last-seen
- message pagination
- audio calls
- video calls
- video/audio switching
- mute/camera controls
- incoming/missed call notifications
- PWA/native incoming-call hooks
- authenticated Socket.IO
- existing session-replacement security model

## Verification performed
PASS — backend syntax: 173 JavaScript files, 0 syntax failures.
PASS — chatContractTest
PASS — chatSecurityRegressionTest
PASS — callFlowContractTest
PASS — callAuthRegressionTest
PASS — presenceContractTest
PASS — portalUiContractTest
PASS — routeContractTest (307 backend routes; 162 frontend API call patterns mapped)
PASS — staticIntegrityTest (173 backend JavaScript files)

## Environment limitation
A full dependency-based production Vite build could not be completed because dependency installation (`npm ci`) timed out in the execution environment. Therefore this ZIP is not represented as a live-production build-pass claim.

Real two-browser/two-device WebRTC completion and production deployed testing remain environment-dependent. The source-level contracts and targeted regression checks above pass.
