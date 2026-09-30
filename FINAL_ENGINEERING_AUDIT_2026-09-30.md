# Benevolent MIDAX — Final Engineering Audit & Release Report

**Audit date:** 2026-09-30  
**Baseline:** uploaded `benovelent_midax-main (6).zip`  
**Release ZIP:** `benovelent_midax-modernized-2026-09-30.zip`

## Executive status

The uploaded repository was inspected as an existing full-stack application, not rebuilt. The final source changes are limited to evidence-backed repairs, portal UX wiring, privacy hardening, regression coverage, plus release documentation/inventory.

**Repository regression status:** `PASS — verified`  
**Authenticated live portal testing:** `NOT VERIFIED — unavailable in current environment`  
**Production Vite build:** `NOT VERIFIED — unavailable in current environment`  
**Oxlint:** `NOT VERIFIED — unavailable in current environment`  
**External MongoDB/Cloudinary/Redis/Resend/M-Pesa/WebRTC execution:** `NOT VERIFIED — unavailable in current environment`

This is therefore **not certified as fully production-ready** from this environment. The source/contract suite is green, but the missing frontend build toolchain and lack of authenticated browser interaction prevent a complete production acceptance claim.

## A. Architecture established

The current repository is an existing Vite/React frontend with an Express/Mongoose backend. The backend includes role middleware, finance/ledger services, M-Pesa/Daraja integrations, Cloudinary upload handling, Redis/cache hooks, Socket.IO realtime messaging/presence, notifications, audit logging, claims/support/community-assistance workflows, reports, migrations and mobile/native calling notes.

Key source areas inspected include:

- frontend routes and portal-section navigation;
- authentication/session/cookie/CSRF handling;
- backend role authorization;
- frontend API calls and mounted API routes;
- claims/support/community-assistance state transitions;
- M-Pesa STK/manual/callback/transaction models;
- notification creation/read/dedupe lifecycle;
- finance/ledger calculations and exports;
- dependents and document permissions;
- chat/presence/call-related realtime code;
- Cloudinary/local upload fallback behavior;
- Redis/cache invalidation;
- public content and fallback/error copy;
- migration ordering and governance-sensitive policy changes;
- environment-variable coverage;
- package/build/deployment contracts.

## B. Verified working

### Repository/source contracts

`PASS — verified`

`npm test` completed with exit code `0`.

The final run verified:

- all declared package script targets exist;
- backend syntax check passed for **178 JavaScript files**;
- frontend relative import resolution passed for **134 source files**;
- repository integrity requirements;
- **288 frontend API calls** against mounted backend routes;
- **66 unique portal menu/section paths**;
- finance opening/running/closing ledger math and status filtering;
- notification event identity/dedupe rules;
- dependent member/admin permission and workflow contracts;
- medical ownership, community beneficiary privacy, poll access and published feedback-download access controls;
- user-facing notification and M-Pesa error handling;
- management-report fields, period filters and exports;
- M-Pesa STK idempotency/pending/callback contracts;
- single-client presence initialization and live-heartbeat semantics;
- removal of SuperAdmin ordinary chat/call UI exposure;
- production contract regression checks;
- latest production-error/delete/print-head coverage;
- support repayment policy guardrails;
- verified-repair regression coverage for community workflow, payer identity, authorization, notification idempotency, M-Pesa configuration, meeting-minutes upload and role-aware UI.

### Live public availability

`PASS — verified`

The public Vercel root responded with the Benevolent MIDAX public application shell on 2026-09-30. The available web channel reports the site title and states that the interactive member portal requires JavaScript.  

`PASS — verified`

The Render backend root responded with a JSON health-style application response identifying Benevolent Midax API version `18.5.0` and status `Running` on 2026-09-30.

## C. Defects fixed in this audit

### 0. Global portal search was visually present but not functionally connected

**Evidence:** `DashboardTopbar.jsx` only matched a small set of menu titles on Enter and otherwise dispatched `benovelent:portal-search`; there was no consumer for that event, while a real authenticated `/api/platform/search` endpoint already existed.

**Root cause:** the search UI and backend search capability had been implemented independently.

**Repair:** added a shared `PortalCommandCenter` used by Member, Admin and SuperAdmin layouts. Desktop/mobile-compatible Ctrl+K and topbar search open the same command surface. Results call the existing backend search route and navigate only to role-appropriate destinations.

**Regression:** `PASS — verified` by the platform search/activity contract and full repository suite.

### 0.1. Member global search omitted typed claim models

**Evidence:** Member search previously queried only the generic `SupportRequest` collection for claim/support matches, while the repository also stores Medical, Funeral and Education support records in dedicated collections.

**Root cause:** the portal search contract did not cover all Member-owned claim persistence models.

**Repair:** Member search now queries `MedicalSupport`, `FuneralSupport` and `EducationSupport` using `member: req.user._id` ownership filters and merges those results with generic SupportRequest results.

**Regression:** `PASS — verified` by the platform search/activity contract and full repository suite.

### 0A. Global search could expose private document filenames

**Evidence:** the previous `platformController.search` scanned `documentRoot` and returned matching filenames through an authenticated general-search response.

**Root cause:** private document storage was treated as searchable content without an authorization boundary.

**Repair:** general search now scans only the bundled public document directory. Private/member documents remain behind their dedicated protected document routes.

**Regression:** `PASS — verified` by the platform search/activity privacy contract.

### 0B. Activity-center endpoint could expose global audit records to non-SuperAdmin roles

**Evidence:** the prior activity-center implementation used `AuditLog.find({})` for roles other than Member.

**Root cause:** the endpoint did not distinguish governance-wide audit visibility from personal/operational attention data.

**Repair:** only SuperAdmin receives governance-wide audit activity; Member/Admin requests are scoped to the authenticated actor. SuperAdmin activity-center responses also suppress conversation records.

**Regression:** `PASS — verified` by the platform search/activity privacy contract.

### 0C. API client contained dead search/retry scaffolding

**Evidence:** `src/services/api.js` declared unused `isVercelHost` and `pendingGets` symbols.

**Root cause:** stale scaffolding remained after earlier request-routing/retry changes.

**Repair:** removed the unused symbols without altering the active request/retry behavior.

**Regression:** `PASS — verified` by frontend import resolution and full repository suite.


## D. Existing verified repairs retained from uploaded baseline

The following repairs were already present in the uploaded `(6).zip` before this audit. They were re-audited and retained; they are not counted as current source edits.

### Existing repair — STK duplicate-key/idempotency error path used an out-of-scope payer actor

**Evidence:** `backend/controllers/paymentController.js` declared the authenticated `actor` with `const` inside `try`, while the duplicate-key (`11000`) handler in `catch` referenced the same payer identity.

**Root cause:** the actor was not available to the error handler when the transaction creation path raised a duplicate-key/idempotency race.

**Repair:** the STK handler now declares `let actor = null` before `try` and assigns `actor = await resolvePaymentActor(req)` inside the protected flow, keeping the authenticated payer identity available to the duplicate-key handler.

**Regression:** `PASS — verified` by the verified-repair source contract plus full `npm test`.

### Existing repair — Admin Finance UI hard-coded M-Pesa shortcode removed

**Evidence:** `src/pages/admin/AdminFinance.jsx` contained a fallback to `650014` when the backend configuration was unavailable.

**Root cause:** frontend display logic had retained a legacy hard-coded merchant identifier after backend runtime defaults were removed.

**Repair:** the UI now displays `Not configured` until a real backend value is available.

**Regression:** `PASS — verified` by verified-repair regression plus source scan.

### Existing repair — legacy system-settings migration unverified M-Pesa defaults removed

**Evidence:** `backend/migrations/009_create_system_settings_authority.js` previously used literal fallbacks for the manual PayBill/account reference.

**Root cause:** a configuration-seeding migration could create payment settings without an explicit operator-provided value.

**Repair:** migration `009` now defaults those fields to empty values. A new, tightly scoped idempotent migration `011_remove_legacy_unverified_mpesa_defaults.js` clears only those exact legacy values if they already exist in the singleton system-settings record and disables manual collection until real configuration is supplied.

**Safety:** the cleanup migration matches only the legacy literals and does not alter different configured values.

**Regression:** `PASS — verified` by source contract and full repository suite.

### Existing repair — Admin Finance heading no longer exposes a hard-coded PayBill literal

**Repair:** the heading was changed from the literal merchant number to the truthful generic `M-PESA PayBill submissions` label.

**Regression:** `PASS — verified`.

## E. Existing verified business-rule repairs retained

The uploaded ZIP already contains the following source-level repairs, which were re-audited rather than assumed to be correct:

- Community support requests enter `community_appeal_pending_review`; they do not automatically become open payment campaigns.
- Authorised review transitions a community case to an open campaign; rejection records a rejected review outcome and reason.
- Community campaigns persist explicit workflow states rather than collapsing appeal and campaign semantics.
- M-Pesa transactions preserve both `payerId` and `payerModel` for Member/Admin identity while keeping the legacy member field for compatibility.
- SuperAdmin is excluded from ordinary community contributions at route/controller level.
- Admin/Leader community contributions use real payment flow rather than UI-only eligibility.
- Meeting-minutes publishing includes the selected cover image in the existing FormData request.
- Notification event identities are deduplicated through the central notification lifecycle.
- Public-page unavailable states are truthful rather than claiming implementation/configuration success.
- Dependent documents are exposed through protected download routes; member/admin permissions are separated and audited.

## F. Modernized / UX work

The current application already contains a shared portal design system and responsive shell. The audit preserved those existing structures instead of replacing working UI with an untested wholesale rewrite.

The source confirms:

- section-based Member/Admin/SuperAdmin portal hubs;
- responsive desktop sidebar and mobile navigation/drawer behavior;
- shared portal cards, tables, status badges, dialogs, alerts and loading states;
- mobile overflow hardening and `prefers-reduced-motion` support;
- lazy-loaded page routes;
- modern public-page fallback messaging;
- role-aware community-support actions;
- protected dependent-management surfaces.

The additional UI changes made in this audit include the removal of misleading M-Pesa configuration values from the Admin Finance interface and the new shared portal Command Center for permission-aware search and Attention items.

A browser-level visual review across mobile/tablet/desktop could not be completed in this environment, so no unsupported visual PASS is reported.

## G. Security and authorization findings

Source-level verification confirms:

- authentication middleware resolves canonical user roles and checks session/version state;
- protected routes enforce backend authorization rather than relying on frontend role state;
- cookie-auth mutation requests use CSRF protection;
- CORS is allow-listed rather than open by default;
- M-Pesa contributor routes exclude SuperAdmin;
- sensitive M-Pesa transaction access is filtered by the authenticated payer actor;
- dependent document downloads are permission-checked server-side;
- settled M-Pesa records are protected from permanent deletion;
- no real `.env` file was added to the release package;
- environment examples use placeholders rather than actual secrets.

No secret-like MongoDB URI, private key, or API-key pattern was found in the inspected frontend/public/backend source outside environment-example placeholders and test documentation patterns.

## H. Business-rule verification

The verified source workflow is:

`Member contribution → Benevolent fund/account record`

`Member support/claim request → Leader/Admin review`

`Decision → approved constitutional support OR rejected`

`Rejected member → community-support request/appeal`

`Authorised review → community campaign may open`

`Eligible contributors → Member + eligible Admin/Leader`

`SuperAdmin → governance/system administration, not ordinary community contribution`

The education-support code path requires special governance caution. The repository contains an `010_enable_education_policy.js` migration, but that migration is not registered in `runMigrations.js`, while migration `005_align_policies_to_constitution.js` explicitly disables the education policy. This audit **did not register migration 010** because doing so would change the governing benefit set without authoritative approval. The existing policy guardrail test passes.

## I. Exact test results

### Full regression suite

Command:

`npm test`

Result:

`PASS — verified`

Exit code: `0`

Key final measurements:

- 178 backend JavaScript files syntax-checked;
- 134 frontend source files import-checked;
- 288 frontend API calls matched against mounted backend routes;
- 66 unique portal menu/section paths checked;
- all listed finance, notification, access-control, M-Pesa, presence, production-contract, latest-fix, business-policy and verified-repair suites passed.

### Vercel asset contract

Command:

`npm run test:vercel-assets`

Result:

`NOT VERIFIED — unavailable in current environment`

Observed blocker:

`dist/index.html is missing. Run the Vite production build first.`

### Production build

Command:

`npm run build`

Result:

`NOT VERIFIED — unavailable in current environment`

Observed blocker:

`node_modules/vite/bin/vite.js` is missing from the installed dependency tree.

The repository's npm cache was empty and the environment could not resolve `registry.npmjs.org`, so a clean dependency installation could not be completed here.

### Lint

Command:

`npm run lint`

Result:

`NOT VERIFIED — unavailable in current environment`

Observed blocker:

`oxlint: not found` because the usable dependency installation was incomplete.

## J. Live-verification status

### `VERIFIED LIVE`

- Vercel public root reachable and serving the Benevolent MIDAX application shell.
- Render backend root reachable and reporting API version `18.5.0` with `status: Running`.

### `NOT VERIFIED — unavailable in current environment`

- authenticated Member login/session flow;
- authenticated Admin/Leader portal interactions;
- authenticated SuperAdmin portal interactions;
- real MongoDB read/write behavior under test credentials;
- real Cloudinary uploads;
- Redis/cache behavior in production;
- Resend/email delivery;
- real Safaricom M-Pesa STK/manual/callback execution;
- Socket.IO/WebRTC/TURN call execution;
- browser-level responsive/visual testing;
- production Vercel build output.

The web inspection tool could not access the protected subroutes/API paths required for authenticated acceptance testing, so those items are deliberately not marked PASS.

## K. Environment/configuration review

The repository's backend and frontend references are fully represented in the supplied `.env.example` files.

### Required and source-documented

MongoDB, JWT, CORS, M-Pesa/Daraja, Cloudinary, uploads/document roots, email/SMS/push integrations, frontend API/socket URLs, and optional WebRTC/TURN settings are represented in configuration examples.

### Not verified

Actual deployed environment values and provider connectivity are not available to this environment and were not inferred.

### Optional/feature-gated

Redis, B2C M-Pesa, SMS, push and WebRTC/TURN are implemented/configured as optional or feature-gated paths.

### Governance-sensitive

Education policy enabling remains deliberately disabled in the migration chain to avoid changing the approved benefit set without authoritative documentation.

## L. Defect / feature matrix summary

| Area | Finding | Action | Result |
|---|---|---|---|
| Authentication | Role middleware/session/CSRF structure present | Re-audited | PASS — verified at source/contract level |
| API contracts | Frontend API calls map to mounted routes | Re-audited | PASS — verified; 288 calls |
| Claims/community | Appeal and campaign states are distinct | Re-audited | PASS — verified |
| Community M-Pesa | Member/Admin payer model separated from SuperAdmin | Re-audited | PASS — verified |
| Notifications | Central event identity/dedupe path | Re-audited | PASS — verified |
| Chat/presence | Role filtering, no self-chat, listener cleanup contracts | Re-audited | PASS — verified at contract level |
| Dependents | Admin/SuperAdmin management and protected documents | Re-audited | PASS — verified at contract level |
| Finance/ledger | Real-record calculations and export wiring | Re-audited | PASS — verified at contract level |
| M-Pesa STK catch | Payer actor scope bug | Fixed | PASS — verified |
| Admin Finance config | Hard-coded shortcode fallback | Fixed | PASS — verified |
| System settings | Legacy hard-coded manual M-Pesa defaults | Fixed + cleanup migration | PASS — verified |
| Frontend build | Vite dependency missing | Could not execute | NOT VERIFIED — unavailable in current environment |
| Lint | Oxlint dependency missing | Could not execute | NOT VERIFIED — unavailable in current environment |
| Authenticated live UI | Browser authentication unavailable | Not claimed | NOT VERIFIED — unavailable in current environment |

## M. Files changed in this audit

### Modified (9)

- `FINAL_ENGINEERING_AUDIT_2026-09-30.md` — updated audit evidence, counts, release scope and verification limits.
- `PAGE_INVENTORY_2026-09-30.md` — added the global Command Center / Attention inventory entry.
- `PATCH_NOTES.md` — recorded the current audit delta.
- `backend/controllers/platformController.js` — added role-scoped global search/activity hardening and Member-owned typed claim search.
- `package.json` — added the platform search/activity regression test to the standard test chain.
- `src/components/dashboard/DashboardTopbar.jsx` — wired topbar Search and Attention controls to the shared command center.
- `src/layouts/DashboardLayout.jsx` — mounted the shared command center across authenticated portals.
- `src/services/api.js` — removed unused request-routing/retry symbols.
- `src/styles/topbar.css` — added compact Attention-control states.

### Added (3)

- `backend/scripts/platformSearchActivityRegressionTest.js` — regression contract coverage for search/activity authorization and privacy.
- `src/components/dashboard/PortalCommandCenter.jsx` — shared Ctrl+K/Search/Attention UI.
- `src/components/dashboard/PortalCommandCenter.css` — responsive and reduced-motion styling for the command center.

### Removed

No baseline source files were removed.

## N. Release packaging

Before packaging, the release tree was checked for:

- installed `node_modules` removal;
- temporary build/development files;
- real `.env` files;
- accidental debug artifacts;
- fake/mock production data;
- changed-file scope.

The final release ZIP is a source package and does **not** include the incomplete local `node_modules` directory created during the audit environment's failed dependency installation.

## O. Final conclusion

The repository is in a stronger verified source state than the uploaded baseline. This audit repaired and regression-tested the portal search/Attention integration, search privacy boundaries, activity-center role scoping, typed-claim search coverage, and stale API-client scaffolding. Core role, claims, community-support, notification, finance and M-Pesa business-rule contracts from the uploaded baseline were re-audited and retained.

A full production acceptance statement would be unsupported until the project can be installed cleanly with its declared frontend dependencies, built with Vite, linted with Oxlint, and exercised through authenticated Member/Admin/SuperAdmin browser sessions against the real deployed services.


## Release delta for uploaded ZIP (2026-09-30)

The source archive `benovelent_midax-main (6).zip` was used as the exact working baseline. The release changes only the following application/source surfaces:

- shared portal Command Center wired into Member, Admin and SuperAdmin layouts;
- topbar Search and Attention controls;
- permission-aware authenticated `/api/platform/search`;
- activity-center audit/conversation scoping;
- Member search coverage for Medical, Funeral and Education support collections;
- new platform search/activity regression contract;
- root test-suite registration for that regression;
- removal of two unused API-client symbols;
- release documentation/inventory updates.

No baseline application files were removed. Prior M-Pesa, finance, claims, notification, dependent and other repairs described in the audit were already present in the uploaded baseline and were re-audited rather than recoded.

The release ZIP is intentionally separate from the uploaded original.
