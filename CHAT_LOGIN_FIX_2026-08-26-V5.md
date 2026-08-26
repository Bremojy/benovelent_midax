Benevolent MIDAX V5 - Chat and Authentication UX/Role Fixes

Source: benevolent-midax-mpesa-production-chat-fixed-2026-08-26-v4

Fixes:
- Enabled SuperAdmin in HTTP chat authorization.
- Enabled SuperAdmin in Socket.IO messaging, typing, presence, and call handling.
- Removed the backend block that returned zero chat members for SuperAdmin.
- Preserved self-chat and duplicate-profile protections.
- Modernized chat composer errors: upload, microphone, voice-note, and location errors use react-hot-toast instead of browser alert().
- Added attachment/voice-note success feedback.
- Modernized transient call notifications/errors with toast feedback.
- Added login success toast.
- Added friendly login credential mismatch / role mismatch / server error messages.
- Added logout success toast.
- Added modern session/account-mismatch warnings when another account replaces the active browser session.
- Added dedicated chat contract regression test and included it in npm test.

Verification:
- npm test: 16 stages pass including the dedicated chat contract test.
- JavaScript syntax checks pass for changed backend files.
- Production Vite build could not be executed in the offline working environment because node_modules was not present and npm install timed out; Render's npm install succeeds in the deployment logs supplied by the user.

No production credentials are included.
