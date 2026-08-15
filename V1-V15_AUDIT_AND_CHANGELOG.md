# Benevolent MIDAX — V1–V15 Modernization Release (10.0.0)

## Scope
A coordinated stabilization and modernization pass covering routing/API integrity, authentication, member/admin/superadmin portal behavior, realtime communication, mobile responsiveness, forms, notifications, performance foundations, PWA behavior, and assistant UX.

## Major changes implemented
- Added server-enforced `sessionVersion` to Member, Admin and SuperAdmin accounts.
- A successful login increments the account session version and invalidates previous JWT sessions.
- Previous realtime sessions receive a `session-replaced` event and are forced out.
- API authentication now recognizes `SESSION_REPLACED` and clears the client session.
- AuthContext performs periodic session verification so non-chat pages also notice a login on another device.
- Socket.IO now authenticates its handshake JWT and checks account status/session version; unauthenticated sockets are rejected.
- Socket.IO CORS is no longer `*`; it uses configured application origins.
- Socket client now has controlled auto-connect, polling fallback, reconnection and bounded timeouts.
- Added responsive global foundations, safer narrow-screen sizing and reduced-motion support.
- Hardened chat mobile layout and composer sizing.
- Added Vercel security headers and richer public metadata.
- Strengthened the static integrity test to cover session replacement and socket authentication.

## Important runtime features already present and preserved
- Socket.IO realtime chat
- Online/last-seen presence
- Incoming/missed call notifications
- PWA/web-push service worker
- Admin and SuperAdmin portals
- Constitution/document management
- Polls, feedback, claims/support and finance modules
- Smart assistant UI
- Native Android/iOS call bridge scaffolding

## Verification caveat
The ZIP was inspected and patched directly. Full end-to-end browser clicking against production credentials requires an interactive browser environment, so those actions are not claimed as completed here. The package includes static integrity checks and the modernization changes are designed to be validated on the next local/deployed run.

## V12 — Dashboard geometry, persistent mobile navigation, portal themes & chat self-filtering
- Constrained desktop portal content to the viewport remaining after the fixed sidebar.
- Kept the dashboard bottom navigation persistent across all mobile portal pages.
- Added a mobile Dashboard-home path on subpages.
- Added green Member, orange Admin, and purple SuperAdmin visual identities.
- Prevented the signed-in user from appearing in chat people/conversation pickers.
- Passed current-user identity into the shared chat directory and retained the existing start-conversation self guard.
- Reduced realtime chat scroll work while preserving smooth scroll after explicit sends.
- Added V12 UI contract testing.
