# Benevolent MIDAX — Final Regression Report

Date: 2026-09-11
Source: uploaded `benovelent_midax-main (2).zip`

## Completion status

The full backend contract/regression suite was executed after the final changes: **35/35 passed**. The source-level integrity, security, route, portal, chat, call, notification, M-Pesa, policy and production-configuration contracts are green.

The frontend production build and configured Oxlint run could **not** be executed in this environment because the locked npm dependencies are not available locally and outbound DNS/network access to the npm registry is unavailable. A real build/lint result is therefore not claimed.

## Major issues found during this pass

### 1. Notification mark-all lifecycle duplication / multi-client inconsistency
The member Notifications page was emitting a socket `read-all-notifications` event and then issuing the authoritative HTTP `PUT /notifications/read-all` request. This duplicated the write path and could leave other open clients with only an unread-list clear rather than the same persisted notification records in history.

**Fixed:** the frontend now uses only the authenticated HTTP update path; the backend updates the existing records and emits `notification-updated` for every affected notification so other clients receive the persisted read state.

### 2. Declined calls were treated as missed calls
The call rejection path called the missed-call notification flow even when the recipient explicitly declined. This could create a misleading "missed call" notification for the person who deliberately declined.

**Fixed:** explicit declines now create a declined call-history summary and do not create a missed-call notification; true missed/timeout paths retain missed-call notification behavior.

## Files changed in this pass

- `backend/controllers/notificationController.js`
- `backend/sockets/messageSocket.js`
- `src/pages/member/Notifications.jsx`
- `backend/scripts/notificationLifecycleRegressionTest.js`
- `backend/scripts/callAuthRegressionTest.js`
- `docs/FINAL_REGRESSION_REPORT_2026-09-11.md`

## Components changed

- Member Notifications page (`src/pages/member/Notifications.jsx`)

## Backend routes changed

None. Existing route contracts remain intact.

## Database/model changes

None in this pass. Existing Notification and Message models were retained.

## Notification fixes

- Removed redundant client-side socket writes for mark-one-read and mark-all-read.
- Preserved server-side ownership checks on notification reads/deletes.
- Mark-all-read now updates existing unread records and persists a shared `readAt` timestamp.
- Mark-all-read broadcasts each persisted notification state change to other connected clients.
- Existing notification creation fanout remains separated from update fanout.
- No automatic mark-all-read-on-page-open behavior was introduced.

## Chat fixes / verification

The existing chat implementation passed its contract, security, presence and routing checks, including self-chat prevention, duplicate-listener cleanup, message persistence and unread-state handling.

## Call fixes / verification

The existing call implementation passed call-flow and call-auth regression checks, including incoming/outgoing signalling, accept/decline/end, timeout, push/native hooks, ringtone hooks, call duration, mode-switch signalling, authentication identity and duplicate-event protections.

The additional decline-vs-missed correction described above was added and its regression assertion passes.

## Authentication and security

Existing security contracts passed. Verified source includes HttpOnly cookie authentication, CSRF protection, JWT claim pinning, session-version replacement, authenticated Socket.IO identity and backend role/ownership authorization.

## Routing and navigation

Passed route-contract, page-parity, portal-page-data-map, portal-shell, UI-contract, V12/V13 shell and regression checks. The existing Vercel SPA rewrite and API/socket proxy configuration remain unchanged.

## Responsive/mobile verification

Static portal-shell/UI contracts passed, covering fixed desktop sidebar, mobile dock spacing, scroll-safe shell layout, mobile drawer separation and chat self-filter behavior.

Actual browser/device interaction was not executable here because browser automation and the frontend dependency toolchain were unavailable.

## Policy / support / finance / M-Pesa

Existing policy CRUD and propagation paths remain wired through `/api/policies` with SuperAdmin-only mutation routes and public/member policy reads. Existing education/support validation reads live policy limits.

Existing M-Pesa contracts passed, including manual PayBill handling, callback/query flows, member-only payment enforcement, transaction indexes, diagnostics and portal-role separation. No production credentials were changed or invented.

The configured manual collection defaults remain `PayBill 247247` and account/reference `0650186528835` in the codebase, overridable through environment variables.

## Tests executed

- All 35 backend `*Test.js` scripts: **35 passed / 0 failed**
- `sourceQualityTest.js`: **passed**
- `staticIntegrityTest.js`: **passed**
- Backend JavaScript syntax checks (`node --check`): **passed**
- Local relative-import audit: **510 references checked, 0 missing**
- Public asset reference audit: **0 missing**
- JSON configuration audit: **passed**

## Important blocked validations

### Frontend production build
**Blocked.** `npm ci` cannot complete because this environment cannot resolve/access the npm registry; offline installation fails with `ENOTCACHED` for a locked dependency. Because Vite is not installed, `npm run build` was not falsely represented as successful.

**Required external change:** run `npm ci --include=dev --no-audit --no-fund` in a normal networked CI/local environment, then run `npm run build` and `npm run vercel-build`.

### Oxlint
**Blocked for the same reason.** The configured `oxlint` executable is a project devDependency and is not installed in the current environment.

**Required external change:** after dependency installation, run `npm run lint` and resolve any real lint findings before deployment.

### Live browser/network regression
**Blocked.** The environment used for this repair does not provide a browser automation session against the production Vercel/Render deployment.

**Required external change:** execute authenticated browser/mobile tests against the deployed frontend and backend, including two-account call/chat flows, notification persistence across refresh/tabs, microphone/camera permissions, background push behavior, and actual narrow phone viewport layout.

### Live M-Pesa / Daraja production transaction
**Blocked by design.** Static/unit contracts can validate request construction and safeguards, but a real transaction requires the deployment's valid Daraja credentials, callback URLs and network access to Safaricom.

**Required external change:** configure and verify the real production credentials and callback endpoints, then perform a controlled live transaction and reconciliation test.

## Final assessment

No known testable backend/static defect remains in the source after the final regression pass. The remaining unverified items are environment-dependent frontend build/lint and live browser/infrastructure checks, not silently assumed green results.
