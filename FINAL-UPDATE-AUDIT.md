# Benevolent MIDAX — Call/Auth/Assistant Update Audit

## Implemented

- Fixed native incoming-call Answer/Decline routing by supporting both `incomingNativeCall` and `incomingPushCall` deep links.
- Added automatic Answer handling for notification/native action links and reliable Decline handling using `callId`.
- Consolidated recipient call delivery to authenticated recipient socket IDs so a caller does not receive their own incoming-call notification.
- Added 35-second call timeout handling on both caller and receiver paths.
- Added connected-call duration timer in the call overlay.
- Added audio/video mode switching during connected calls with WebRTC renegotiation.
- Added call-history messages to conversations with call type, status and duration.
- Wired the originating conversation ID through outgoing calls so call history appears in the correct chat.
- Added persistent/high-priority web push call notification settings where supported by the browser/OS.
- Updated native Android incoming-call notification channel version so a previously-muted channel does not keep an old sound configuration after reinstall/update.
- Added one-active-account-per-browser-origin behavior using a cross-tab storage marker plus BroadcastChannel; signing in a different account logs the prior portal session out.
- Expanded the Benevolent Assistant FAQ/knowledge base with feedback, membership, claims, finance, chat, calling, notifications, permissions, account security, PWA and portal questions.
- Removed the unused duplicated `backend/src` copy of the entire React frontend.
- Removed the duplicated `backend/mobile` native layer; the root `mobile` layer is now canonical.
- Removed stale duplicate build/backup artifacts from the distribution package.
- Final ZIP excludes installed `node_modules`, `.git`, and real `.env` files; `.env.example` files are retained.

## Automated verification

All repository regression tests passed:

- Security contract
- Source quality
- Static integrity
- Frontend/backend route contract
- Portal UI contract
- Call flow contract
- Call/auth regression contract
- Portal shell contract
- Regression audit

Backend JavaScript syntax was previously verified by the project's static integrity test.

## Build verification note

A production Vite build was attempted. The uploaded working environment was missing the optional Linux native Rolldown binding (`@rolldown/binding-linux-x64-gnu@1.1.5`). Reinstalling dependencies could not complete because this execution environment had no working npm registry/DNS access. This is an environment/dependency-installation limitation, not a reported application-test failure.

For deployment, run a clean install (`npm ci`) in the deployment/build environment before `npm run build`.
