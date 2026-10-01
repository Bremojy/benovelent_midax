# BENEvolent MIDAX — End-to-End Engineering Audit & Repair Report

Date: 2026-10-01
Source of truth: `benovelent_midax-main-updated.zip` supplied for this audit

## A. SYSTEM UNDERSTANDING

The repository is a single BENEvolent MIDAX application with a React/Vite frontend and an Express/Node backend. MongoDB/Mongoose is the persistence layer. Socket.IO supplies authenticated realtime transport for messaging, presence, typing and call signaling. WebRTC media is implemented in the shared chat call overlay. Cloudinary/storage and PWA/service-worker infrastructure are already part of the project and were preserved.

The frontend route root is `src/App.jsx`. It uses lazy-loaded pages with separate Member, Admin and SuperAdmin layouts/guards. Authentication/session state is provided through the existing auth context; Socket.IO state is provided through the existing socket context and authenticated socket bootstrap.

The backend is registered from `backend/server.js`, with route modules under `backend/routes`, controllers under `backend/controllers`, Mongoose models under `backend/models`, authentication/authorization middleware under `backend/middleware`, and realtime handlers under `backend/sockets`.

The messaging implementation is shared by Member and Admin pages through `src/components/chat/MessageCenterPage.jsx`. Member and Admin routes remain separate for portal navigation/authorization, but the chat experience is not duplicated. SuperAdmin has no normal chat-center route.

The call path is:

`CallOverlay` → authenticated Socket.IO signaling → `messageSocket.js` → WebRTC offer/answer/ICE → local/remote media streams.

The PWA call path is:

Push event → `public/sw.js` → IndexedDB pending-call record → `/member/messages` or `/admin/messages` → `MessageCenterPage` → `CallOverlay`.

The audit inspected 524 ZIP entries, 53 page JSX files, 85 declared frontend routes, 28 backend route modules, and 34 Mongoose model files. Static endpoint-contract testing now verifies 283 frontend API calls against mounted backend routes.

## B. CRITICAL FINDINGS

1. `src/pages/member/Support.jsx` contained the exact JSX syntax defect shown by the Vercel log: the conditional expression immediately before `Requested Amount (KES)` closed with `)` instead of `)}`.
2. `src/components/member/QuickActions.jsx` pointed “View Statement” to nonexistent `/member/statements`; the canonical account/ledger page is `/member/accounts`.
3. `AdminFinance.jsx` and `adminFinance.css` were a duplicate/unreachable finance implementation. The canonical Admin surface is `/admin/accounts`; `/admin/finance` is retained only as a backward-compatible redirect.
4. Chat directory serialization for Admin mirror profiles was previously too permissive. It was changed to an explicit safe-field allowlist rather than returning the raw mirror document.
5. New Admin chat mirrors no longer persist a generated temporary password; existing authenticated Admin ownership/mirror identity is reused.
6. Direct-message authorization was hardened server-side to reject group-shaped conversations and SuperAdmin participants for normal messaging operations.
7. Realtime sidebar updates were incomplete when the recipient had not joined a conversation room. A canonical `conversation-updated` fanout was added to the authenticated chat-identity room.
8. The service worker deleted pending incoming-call data during notification-click navigation, which could race the messaging page before the WebRTC offer was consumed. The record is now retained until the chat center consumes/closes it.
9. Active calls were not explicitly cleaned when an initiating/recipient socket disconnected after connection. Disconnect cleanup was added so media sessions do not leave permanent server-side busy state.
10. Server-generated call IDs were emitted only after notification/push persistence work, which could delay the caller's call ID relative to early ICE candidates. `call-started` is now emitted before notification work.

## C. FIXES IMPLEMENTED

### Chat/security/realtime

- Enforced member/Admin-only ordinary chat roles through canonical chat identity resolution.
- Blocked self-chat and SuperAdmin participation on the server as well as the frontend.
- Tightened conversation/message authorization to direct 1-to-1 conversations with exactly two participants.
- Added active-status enforcement when starting a new conversation with a target account.
- Preserved the existing Admin portal-owner/chat-profile mirror mechanism instead of inventing a new identity system.
- Reused the existing Member directory and authenticated Admin mirror records; no fabricated contacts were added.
- Expanded directory search to member number, phone and existing organization fields exposed by policy.
- Applied pinned-first conversation ordering consistently, including the mobile directory.
- Hardened notification sender/recipient identity for Admin mirror participants.
- Added recipient-side `conversation-updated` realtime fanout.
- Preserved message idempotency, reply-to conversation checks, ownership checks, edit/delete/reaction rules and direct-message search authorization.
- Added failed-message retry metadata preservation, attachment metadata persistence and voice-recording timer cleanup.
- Added explicit delivered/read socket acknowledgement behavior already supported by the existing architecture.

### Calls/PWA

- Preserved authenticated Socket.IO signaling and WebRTC media.
- Preserved server-side call recipient authorization, self-call protection, SuperAdmin exclusion and conversation membership verification.
- Added a busy-call guard to prevent duplicate simultaneous calls.
- Moved the server `call-started` event ahead of notification/push persistence so the caller gets the canonical call ID promptly.
- Added disconnect cleanup and call-summary/missed-call handling.
- Preserved decline vs missed distinction and the 35-second timeout behavior.
- Added WebRTC media/ringtone cleanup on `CallOverlay` unmount.
- Corrected PWA pending-call ownership so `public/sw.js` no longer deletes the IndexedDB call record before the chat center consumes it.

### Routing/cleanup

- Fixed `/member/statements` to the existing `/member/accounts` destination.
- Removed the confirmed-obsolete `AdminFinance.jsx` and `adminFinance.css` implementation.
- Updated active Admin dashboard links to `/admin/accounts`.
- Kept `/admin/finance` as a backward-compatible redirect to `/admin/accounts`.
- Added a route/page regression test covering declared routes, lazy page existence, stale `Link`/`path`/`href`, literal `navigate(...)`, and direct `window.location` internal references.

### Test/verification infrastructure

- Added `backend/scripts/routePageInventoryRegressionTest.js`.
- Extended `backend/scripts/chatOneToOneRegressionTest.js` with the requested A–AE controls and additional call/PWA/chat regressions.
- Kept package dependency declarations unchanged; only the test-script chain was extended.

## D. DELETED OBSOLETE ITEMS

Confirmed obsolete and removed:

- `src/pages/admin/AdminFinance.jsx`
- `src/pages/admin/adminFinance.css`

The old `/admin/finance` route itself was not deleted because it is intentionally preserved as a compatibility redirect to `/admin/accounts`.

The nonexistent `/member/statements` page was not created; its stale navigation reference was repaired to the existing canonical account/ledger page.

No legitimate dynamic page was removed. The final source inventory reports all 53 page JSX implementations as represented by the application's lazy route imports.

## E. API CONTRACT VERIFICATION

The repository's API contract test passed with:

- 283 frontend API calls verified against mounted backend routes.
- 65 unique portal menu/section paths verified.
- 85 declared frontend routes inventoried.
- All statically lazy-loaded page modules resolved.
- No stale internal `path`, `to`, `href`, literal `navigate(...)`, or direct internal `window.location` targets were found by the new route inventory test.

This verifies endpoint/path/method/registration consistency through the repository's existing contract tests. It does not substitute for live database-backed request execution.

## F. CALLING SYSTEM VERIFICATION

Static/source verification confirms the following chain is internally consistent:

Caller → authenticated Socket.IO `call-user` → recipient authorization → server call ID → recipient-specific `incoming-call` → WebRTC offer/answer → ICE candidates → connected state → mute/camera/mode controls → `end-call`/reject/timeout → call summary/missed-call handling → cleanup.

The server derives identity from the authenticated socket and verifies the canonical Member/Admin chat identity. Self-call, SuperAdmin and unauthorized conversation calls are rejected. The call system now also protects against concurrent active calls and stale server state after socket disconnect.

PWA incoming-call recovery is source-verified: service-worker push stores the call, notification click routes to the correct Member/Admin page, and the chat center consumes/removes the pending call after the call UI is handled.

A live two-browser WebRTC call was **not** executed in this environment. There is no installed Playwright/Puppeteer test harness, Mongo/Mongoose runtime, or running backend service available in the current container. Chromium is present as a binary, but the application could not be served because the required runtime dependencies are absent.

## G. AUTHENTICATION VERIFICATION

Static verification confirms:

- HTTP protected routes use the existing authentication/role middleware.
- Socket.IO connections validate JWT/session state, role and session version before joining authenticated rooms.
- Member/Admin chat identity is canonicalized through `chatProfile.js`.
- SuperAdmin has no ordinary chat identity/route and is rejected by chat role checks.
- Frontend Member/Admin chat pages share the same Messaging Center while retaining their existing portal route guards.

Live login/session restoration/expired-session behavior was not executed because the backend cannot start in this container without its installed Express/Mongoose dependency set and deployment environment/database.

## H. DATABASE VERIFICATION

The audit inspected 34 Mongoose model files and the chat `Conversation`/`Message` schemas, including their participant relationships, message fields, viewer-specific state arrays/maps and indexes.

Important existing indexes remain intact, including the direct-conversation key uniqueness constraint and message conversation/time/idempotency indexes.

No destructive database migration was required. No collections were dropped, no messages/conversations were reset, and no finance/support/public-content data was wiped.

One behavioral improvement was made to new Admin chat-profile creation: it no longer persists a generated temporary password on the mirror document. Existing stored records are not destructively rewritten by this change.

Actual MongoDB connectivity and live persistence tests were **BLOCKED** because Mongoose/MongoDB dependencies and a real database connection are not available in the current environment.

## I. TEST RESULTS

| Area | Result | Evidence / Notes |
|---|---|---|
| Build | BLOCKED | `npm run build` exits because `node_modules/vite/bin/vite.js` is absent. `npm ci --include=dev --no-audit --no-fund` was attempted but timed out in this environment. |
| Backend startup | BLOCKED | `node backend/server.js` cannot start because `express` is absent from the incomplete local dependency tree. |
| Authentication | BLOCKED | Static auth/socket-role contracts pass; live login/session testing requires a runnable backend/database. |
| API contracts | PASS | 283 frontend calls matched mounted backend routes. |
| Member workflows | PASS (contract) | Existing workflow/integrity/access-control suites pass; live DB workflow execution blocked. |
| Admin workflows | PASS (contract) | Existing workflow/menu/API/security suites pass; live DB execution blocked. |
| SuperAdmin workflows | PASS (contract) | CMS/security/data-integrity regression suites pass; live portal execution blocked. |
| Chat | PASS (source regression) | A–AE 1-to-1 regression contract passes; live Socket.IO/DB/browser exercise blocked. |
| Audio calls | PASS (source contract) | Signaling/auth/timeout/decline/cleanup checks pass; live WebRTC media call blocked. |
| Video calls | PASS (source contract) | Offer/answer/ICE/media-mode/security checks pass; live WebRTC media call blocked. |
| Uploads | PASS (contract) | Upload/workflow/static integrity checks pass; live Cloudinary upload blocked. |
| Notifications | PASS (contract) | Notification lifecycle and chat-notification regression tests pass; live push delivery blocked. |
| Responsive UI | BLOCKED | No runnable browser app/build was available for live mobile/tablet/desktop interaction testing. |
| Dead-route cleanup | PASS | 85-route inventory passes; no stale internal navigation targets found. |
| Full regression suite | PASS | `npm test` completed successfully after the final source changes. |

The final full test run passed the repository's complete declared test chain, including backend syntax (184 JS files), frontend import resolution (135 source files), route/API contracts, finance, notifications, chat, access control, presence, SuperAdmin chat exclusion, production contracts, workflow integrity, CMS/security, and public CMS wiring.

## J. REMAINING BLOCKERS

1. The local container does not have the full installed dependency tree. Vite, Oxlint, Express and Mongoose are absent after the attempted dependency installation timed out.
2. `npm run build`, `npm run lint`, `npm run vercel-build` and `node backend/server.js` therefore could not be truthfully marked PASS.
3. No live MongoDB connection is available.
4. No live Cloudinary, M-PESA, SMTP, push/VAPID or TURN environment was available for end-to-end external-service testing.
5. No browser automation framework is installed. A Chromium binary exists, but the app cannot be served locally because the runtime dependencies are incomplete.

## K. RELEASE CHECK

The source repair and regression work are complete, but this environment does **not** provide enough runtime verification to claim the project is release-ready.

The most important production verification still required is a clean CI/Vercel run with:

`npm ci --include=dev --no-audit --no-fund`

followed by:

`npm run build`
`npm run lint`
`npm run vercel-build`

plus deployment-backed Member/Admin login, MongoDB persistence, Cloudinary upload, Socket.IO presence/message tests, and a real two-browser audio/video WebRTC call.

No production credentials were added. The ZIP contains only the repository's environment templates; no real `.env`/credential files were introduced.
