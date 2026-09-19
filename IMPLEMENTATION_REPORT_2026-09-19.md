# Benevolent MIDAX — Repository Audit & Implementation Report
Date: 2026-09-19

## A. Files changed
Targeted repairs were made without a repository-wide rewrite. Changed/new source files are listed by `diff -qr` against the pre-change backup and include:

- Backend controllers: contributionController.js, dependentController.js, financeController.js, notificationController.js, paymentController.js
- Backend models: Broadcast.js, DependentDocument.js, DependentEditRequest.js, Notification.js
- Backend routes: dependentRoutes.js, memberRoutes.js
- Backend services: financeLedgerService.js, memberBroadcastService.js, pushService.js
- Backend sockets/utilities: messageSocket.js, onlineUsers.js, presence.js (new), socket.js, chatProfile.js
- Backend regression: productionContractRegressionTest.js (new)
- Frontend chat/accounts/support/dependent/dashboard pages and components listed in the final diff
- Root package.json test script integrity

## B. Backend changes
- Centralized authenticated live presence registration for all three portal roles.
- Protected the member chat-recipient endpoint with the same member/admin chat-role gate used by chat/call routes.
- Member finance history and constitution-ledger/export paths are explicitly member-scoped.
- Finance cache invalidation is triggered from contribution/payment write paths.
- Dependent edit/delete is restricted to Admin/SuperAdmin; member attempts return explicit controlled-workflow responses.
- Protected dependent document downloads with authorization and private/no-store headers.
- Added audit logging for dependent document verification/removal and cache invalidation.
- Broadcast requests are idempotent and delivery metrics are returned separately by channel.

## C. Frontend changes
- Removed SuperAdmin chat UI references and the SuperAdmin dashboard chat-style metric.
- Member/Admin message loaders now fail visibly instead of turning API errors into fake empty data.
- Accounts pages load `/finance/book-balance` immediately on mount.
- Support/Broadcast and other major independent data loaders surface partial-load errors.
- Dependent UI exposes add/view/document upload/edit-request workflows instead of direct member edit/delete controls.

## D. Database/model changes
- DependentDocument accepts front/back ID document types and stores a non-public storage filename separately from the original filename.
- DependentEditRequest supporting files retain original filename, storage filename, MIME type, uploader identity/model and upload time.
- Notification event identity uses a stable event key and deduplication lifecycle.
- Broadcast model carries separate targeted/delivery counters and a unique request identifier.

## E. Socket/WebRTC changes
- One authoritative presence service owns `user-online` and heartbeat handling.
- Presence is based on an authenticated live socket plus continuing heartbeats; disconnect/expiry marks offline.
- MessageSocket no longer owns duplicate presence handlers.
- Chat/call socket handlers require member/admin chat roles; SuperAdmin is excluded from ordinary chat/call identities.
- Call timeout is 35 seconds and the frontend ring timeout uses the same value.
- Audio/video renegotiation, mute, camera state, accept/decline/end, missed-call and ICE signaling paths are wired.
- Optional TURN configuration is consumed from `VITE_TURN_SERVER_URL`, `VITE_TURN_USERNAME`, and `VITE_TURN_CREDENTIAL`.

## F. Notification changes
- Notification creation has one Mongoose lifecycle fanout path.
- Event identity is deduplicated for database, realtime and list/unread calculations.
- Mark-read propagates across notifications sharing the same event identity.
- Call push is suppressed when the recipient is live to avoid duplicate foreground + push alerts.
- Broadcast notifications use event IDs derived from the broadcast request/member pair.
- Service-worker notification links are limited to Member/Admin message routes for chat/calls.

## G. Finance/ledger changes
- `financeLedgerService.js` is the authoritative balance/ledger calculation service.
- Balance includes only approved/completed, non-hidden accounting transactions.
- Selected-period ledger includes an opening balance, chronological entries, running balance and closing balance.
- Live book balance exposes `bookBalance`, `asOf`, `moneyIn`, and `moneyOut`.
- Member ledger queries are explicitly member-scoped; Admin/SuperAdmin receive the shared ledger.
- Finance cache invalidation is centralized and called from relevant write/reconciliation flows.

## H. Dependent/document/edit-request changes
- Members can add and view their own active dependents and supporting documents.
- Members cannot directly update/delete existing dependent records.
- Member edit requests carry requested changes, reason, supporting files and review metadata.
- Pending edit requests notify active Admins and SuperAdmins through deduplicated notification events.
- Admin/SuperAdmin members workflow embeds dependent management, documents, verification, controlled edits and archival.
- Document download is protected rather than exposing raw upload URLs to the client.

## I. Route-contract fixes
- `/api/health` is intentionally implemented in `backend/server.js` and is used by SuperAdmin system/asset checks.
- `/member/contributions` is a dedicated Member-only React route backed by `/api/member/contributions`.
- `/member/chat-members` is now protected by `isChatUser`, excluding SuperAdmin.
- No React route exists for SuperAdmin chat.
- Full static frontend/backend route contract verification covers 283 frontend API calls.

## J. Tests actually run
The final `npm test` completed successfully and reported:

- package script targets: PASS
- backend syntax: PASS (171 JavaScript files)
- frontend relative imports: PASS (133 source files)
- repository integrity: PASS
- frontend/backend API route contract: PASS (283 API calls)
- portal menu/section route contract: PASS (66 unique paths)
- finance ledger math/status filtering: PASS
- notification lifecycle/deduplication: PASS
- dependent permission/workflow contracts: PASS
- management report wiring: PASS
- M-PESA STK/callback contracts: PASS
- live presence contract: PASS
- SuperAdmin chat regression: PASS
- production contract regression: PASS

The final full repository test run after the final changes also passed, including the education-only repayment guardrail test and dependent document replacement contract.

## K. Tests that could not be run and why
- `npm run lint` could not run because `oxlint` was not installed in the incomplete local `node_modules` tree (exit 127).
- `npm run build` could not run because Vite was missing from the incomplete local dependency installation.
- A fresh `npm ci --ignore-scripts --no-audit --no-fund` was attempted, but the container transport timed out before dependencies could be installed.
- Browser/E2E execution against the deployed Vercel/Render application was not available from this environment; external deployment endpoints were not reachable through the available tooling.

## L. Environment-dependent verification still required
The following require a real browser/deployed environment and were not falsely marked as passed:

- Member/Admin login UI flows on production
- actual Socket.IO reconnect/disconnect timing in a browser
- microphone/camera permission prompts and device failure paths
- WebRTC peer-to-peer media, ICE behavior and restrictive NAT traversal
- real TURN-server negotiation using production credentials/configuration
- push notifications in installed/PWA browser contexts
- MongoDB-backed integration behavior against the live Benevolent dataset
- live Vercel/Render deployment smoke tests

TURN configuration is consumed by code, but the production TURN deployment itself could not be verified here.

## M. SuperAdmin chat stale-reference confirmation
No stale SuperAdmin chat route/component references remain in application source, public service-worker code, route/menu configuration, or backend chat authorization. The only remaining literal is inside the intentionally written regression-test matcher that verifies its absence.

SuperAdmin data-integrity tools still mention legacy chat records because they are administrative data-integrity controls, not a SuperAdmin chat workflow.

## N. Three Accounts pages live book balance
Code-level verification confirms Member Accounts, Admin Accounts and SuperAdmin Accounts each request `/finance/book-balance` during initial data loading and display the returned balance, money-in/out and `asOf` metadata without requiring a date-range ledger load. Production browser rendering could not be executed in this environment.

## O. Member contribution history
`/member/contributions` is a dedicated protected Member route and the backend endpoint returns member-owned contribution history and summary data. The controller explicitly scopes Member queries to `req.user._id`.

## P. Member direct dependent edit/delete
Direct existing-dependent `PUT /dependents/:id` and `DELETE /dependents/:id` are no longer Member-authorized. Member requests are rejected with explicit controlled-workflow responses; the route contract/regression test passes.

## Q. Admin/SuperAdmin dependent management
The Members workflow includes the shared dependent-management component with authorized fetch, edit, verification, document upload/verification/removal, and edit-request review. Route/middleware and dependent regression contracts pass. Live UI behavior against production remains environment-dependent.

## R. Frontend/backend route mismatch status
The repository-wide route contract test passed for 285 discovered frontend API calls, and menu-route verification passed for 66 linked portal paths. `/api/health` is implemented intentionally, and no known frontend/backend route mismatch remains in the audited source.

## Final regression notes
- No fake records were added.
- No credentials or production secrets were added to source code or test output.
- Existing business rule separation remains intact: member payroll contributions are distinct from the Constitution ledger; education support repayment remains separate from funeral/medical support.
- `Promise.allSettled()` remains only where independent/non-blocking collection or delivery aggregation is intentional; major user-facing data loaders now surface partial failures rather than presenting fake empty success states.
