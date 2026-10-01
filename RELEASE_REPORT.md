# Benevolent MIDAX — Engineering Audit / Release Report

Release target: `18.5.0`

This release is a source-level repair and regression pass over the uploaded Benevolent MIDAX codebase. It does **not** claim authenticated production workflow success where the execution environment could not provide an interactive authenticated session.

## 1. Verification boundary

### Verified in this execution environment

- Entire uploaded source tree inspected before edits: 449 source files in the original ZIP.
- Backend syntax regression: **PASS** — 182 JavaScript files checked.
- Frontend relative-import regression: **PASS** — 136 source files checked.
- API route contract regression: **PASS** — 294 frontend API calls matched to mounted backend routes.
- Portal/menu route regression: **PASS** — 66 unique linked portal paths checked.
- Full declared `npm test` suite: **PASS** — all 24 declared regression scripts completed successfully after the repairs.
- Added public CMS wiring regression: **PASS**.
- Added audit/CMS security regression: **PASS**.
- Production Vercel asset verification: **BLOCKED** — `dist/index.html` cannot be generated because frontend dependencies could not be installed in the execution environment.
- Frontend production build: **BLOCKED BY ENVIRONMENT** — Vite is not installed because dependency installation timed out.
- Lint: **BLOCKED BY ENVIRONMENT** — `oxlint` is not installed for the same reason.

### Live deployment checks

- Public frontend root: **PASS — reachable**. The deployed site returned its Benevolent MIDAX public application shell.
- Backend root: **PASS — reachable**. The deployed API root reported the Benevolent MIDAX API as running, version `18.5.0`.
- Deep public route interaction: **NOT VERIFIED** — direct deep-route opens were not accessible through the available web verification tool.
- Authenticated Member/Admin/SuperAdmin workflows: **NOT VERIFIED — ENVIRONMENT/ACCESS LIMITATION**. No authenticated browser session was available to this execution environment.
- Two-account chat/call E2E: **NOT VERIFIED — ENVIRONMENT/ACCESS LIMITATION**.
- Cloudinary, Redis, M-Pesa, email/push, TURN and multi-instance production behavior: **NOT VERIFIED — production credentials/runtime configuration are not available in the uploaded source context**.

## 2. Fixed issues

### Audit trail integrity

**Issue:** Audit records could be deleted from a SuperAdmin UI/API path, and the legacy permanent member purge deleted member audit records.

**Root cause:** `DELETE /api/audit-logs/:id`, the SuperAdmin Delete action, and a `deleteMany` purge block treated governance evidence as ordinary data.

**Fix:**
- Removed the destructive audit-log API/controller/UI action.
- Added append-only Mongoose delete guards to `AuditLog`.
- Removed member audit-log deletion from account purge logic.
- Kept audit entries available for reporting and review.

**Verification:** `test:audit-cms-security` and the full 24-script regression suite pass.

### CMS record identity / save contract

**Issue:** SuperAdmin Website Settings decided between `POST` and `PUT` by checking whether content fields were non-empty. A valid existing section with blank content could be treated as new and trigger a duplicate-section error.

**Root cause:** The editor did not preserve the persisted section `_id`.

**Fix:** The editor now stores `_id` and selects `PUT /website/:section` for persisted records and `POST /website` only for genuinely new records.

**Verification:** public CMS wiring regression passes.

### Public CMS propagation

**Issue:** Several SuperAdmin Website Content fields were stored successfully but were not authoritative for the corresponding public pages.

**Fix:** Added a reusable public CMS section hook and wired published WebsiteContent into:

- Home
- Home hero fallback
- Services
- Contact presentation
- Footer copy
- Newsroom presentation
- Events presentation
- Resources presentation

Existing legal-section CMS consumption remains in place.

**Verification:** `test:public-cms-wiring` passes; route/import regressions pass.

### Disclaimer CMS availability

**Issue:** The Disclaimer page existed in the public router/model but the WebsiteContent initialization/default list did not include the `disclaimer` section.

**Fix:** Added Disclaimer to default CMS initialization, default content, and the SuperAdmin Website editor.

### Gallery management

**Issue:** Gallery administration was effectively upload-only. There was no real title/caption/alt text/publication/order management and no safe archive action.

**Fix:** Added a structured `galleryItems` representation while retaining backward compatibility with existing `images` URLs. Added:

- title
- caption
- alt text
- publish/unpublish state
- ordering
- move up / move down
- safe archive from public display
- audit events
- public rendering of metadata
- public cache invalidation
- server-side image MIME enforcement

The archive path retains the stored media rather than silently destroying it.

### Constitution upload security and version history

**Issue:** Constitution uploads were constrained by the browser only; server-side PDF enforcement was missing, and replacements were destructive from a version-history perspective.

**Fix:**
- Require `.pdf` and `application/pdf` server-side.
- Preserve previous Constitution versions in history.
- Add SuperAdmin version-history view/restore.
- Audit uploads and restores.
- Hide version history from public CMS responses.
- Invalidate public Constitution caches after mutations.

### CMS destructive section deletion

**Issue:** The generic WebsiteContent delete route permanently removed CMS sections.

**Fix:** The route now unpublishes the section and retains the stored record/content, with an audit entry. This prevents accidental destruction while preserving the existing API shape.

### Public data exposure

**Issue:** Public WebsiteContent responses included `updatedBy`, Constitution history could otherwise have been exposed through public content responses, and the generic `/website` public endpoint could expose archived/unpublished gallery item URLs even though the dedicated Gallery page filtered them.

**Fix:** Public sanitization strips the internal updater identity and Constitution version history, and the generic public CMS serializer now filters gallery items to published entries. SuperAdmin management endpoints retain the administrative details needed for authorized management.

### Public cache consistency

**Issue:** Constitution and Gallery public reads did not use their existing Redis cache entries consistently, and Constitution upload did not invalidate the public cache.

**Fix:** Added cache reads for public Gallery/Constitution and explicit cache invalidation for Constitution/Gallery/CMS mutations. The central invalidation function remains the authoritative cache-key list.

## 3. Security findings

### Addressed

- Audit-log deletion path removed and model-level append-only protection added.
- Public CMS updater identity removed from responses.
- Constitution history kept out of public responses.
- Constitution upload MIME/extension checked server-side.
- Gallery upload MIME checked server-side.
- CMS delete behavior changed to non-destructive unpublish.
- Existing backend authorization contracts and ownership checks continue to pass the static regression suite.
- Existing production Cloudinary requirement remains enforced by upload configuration.

### Remaining / environment dependent

- Multi-instance Socket.IO call/presence behavior still depends on runtime topology; the current socket state implementation is in-memory and should be treated as single-instance unless a Redis Socket.IO adapter is configured and verified in deployment.
- TURN availability and actual WebRTC relay behavior were not live-tested.
- Production CORS/runtime secrets, M-Pesa credentials and notification providers were not live-tested.
- SuperAdmin retains an explicit permanent administrator deletion operation. It is confirmation-gated and audited, but it intentionally removes the administrator account and certain account-owned records. That behavior should remain a deliberate governance action rather than a casual UI operation.

## 4. Performance / reliability findings

### Addressed

- Public Gallery/Constitution cache reads now use existing Redis cache keys.
- CMS mutations invalidate the relevant public cache.
- Gallery public rendering can consume structured metadata without additional per-item API calls.
- New CMS hook keeps public page reads focused on their relevant section.

### Not verified in production

- Real WebRTC relay quality.
- Multi-instance presence/call scaling.
- Actual Cloudinary transformation sizes.
- Production database query latency and Redis hit rates.
- Real-world Vercel/Render cold-start timing under load.

## 5. UI/UX changes

- SuperAdmin audit screen no longer presents a destructive Delete action.
- Website CMS editor now reliably saves existing sections versus creating duplicates.
- Gallery editor now supports meaningful metadata, ordering and publication state.
- Constitution manager now exposes version history and restore actions.
- Home/Services/Contact/Footer/Newsroom public copy can reflect published CMS edits.
- Public Gallery now renders CMS-managed title/caption/alt text when present and excludes archived/unpublished items from the generic public CMS response.
- User-facing wording for archive/version actions is explicit about retention rather than implying destructive deletion.

## 6. Test matrix

| Area | Workflow | Tested | Passed | Fixed | Remaining |
|---|---|---|---|---|---|
| Member | Login | Static contracts | PASS (static) | Existing auth contracts retained | Live authenticated E2E not verified |
| Member | Profile | Static contracts | PASS (static) | — | Live persistence not verified |
| Member | Documents | Static contracts | PASS (static) | Upload/security contracts retained | Cloudinary live path not verified |
| Member | Dependents | Static contracts | PASS (static) | Existing diff/permission contracts retained | Two-sided E2E not verified |
| Member | Support | Static contracts | PASS (static) | Backend-specific documents/stage/payment guards retained | Live claim review not verified |
| Member | Claims | Static contracts | PASS (static) | State/evidence guards retained | Live lifecycle not verified |
| Member | Accounts | Static contracts | PASS (static) | Ledger/export contracts retained | Live finance reconciliation not verified |
| Member | Notifications | Static contracts | PASS (static) | Reliability/dedupe contracts retained | Provider delivery not verified |
| Member | Chat | Static contracts | PASS (static) | Authorization/reliability contracts retained | Two-account E2E not verified |
| Member | Calls | Static contracts | PASS (static) | Existing call authorization contracts retained | TURN/WebRTC E2E not verified |
| Member | Feedback | Static contracts | PASS (static) | Duplicate/error contracts retained | Live submit/reply E2E not verified |
| Admin | Members | Static contracts | PASS (static) | Archive/audit behavior retained | Live role workflow not verified |
| Admin | Dependents | Static contracts | PASS (static) | Existing review contracts retained | Live approval not verified |
| Admin | Claims | Static contracts | PASS (static) | Payment-evidence workflow retained | Live lifecycle not verified |
| Admin | Finance | Static contracts | PASS (static) | Ledger/payment guardrails retained | Live M-Pesa not verified |
| Admin | Ledger | Static contracts | PASS (static) | Report/export wiring retained | Live export not verified |
| Admin | Broadcast | Static contracts | PASS (static) | Notification reliability contracts retained | Real delivery not verified |
| Admin | Invitations | Static contracts | PASS (static) | Secure activation contracts retained | Real delivery not verified |
| Admin | Chat | Static contracts | PASS (static) | Role/authorization contracts retained | Two-sided E2E not verified |
| SuperAdmin | People | Static contracts | PASS (static) | — | Live role workflow not verified |
| SuperAdmin | Finance | Static contracts | PASS (static) | Payment/audit contracts retained | Live finance not verified |
| SuperAdmin | Governance | Static contracts | PASS (static) | Audit/CMS safety repaired | Live governance workflows not verified |
| SuperAdmin | Chat | Static contracts | PASS (static) | Existing contracts retained | Live two-sided call/chat not verified |
| SuperAdmin | Website CMS | Static + source workflow | PASS | CMS identity, cache, public wiring, gallery, constitution repairs | Live save→public-render E2E not verified |
| SuperAdmin | System | Static contracts | PASS (static) | — | Runtime health integrations not verified |
| Public | CMS rendering | Static wiring + live root reachability | PASS (static); live deep routes NOT VERIFIED | Public CMS wiring repaired | Authenticated/live JS interactions not verified |

## 7. Changed files

Modified:

- `backend/controllers/auditLogController.js`
- `backend/controllers/websiteController.js`
- `backend/models/AuditLog.js`
- `backend/routes/auditLogRoutes.js`
- `backend/routes/websiteRoutes.js`
- `backend/utils/permanentAccountDeletion.js`
- `package.json`
- `src/components/Footer.jsx`
- `src/components/Hero.jsx`
- `src/pages/Contact.jsx`
- `src/pages/Gallery.jsx`
- `src/pages/Home.jsx`
- `src/pages/News.jsx`
- `src/pages/Services.jsx`
- `src/pages/superadmin/SuperAdminAudit.jsx`
- `src/pages/superadmin/SuperAdminConstitution.jsx`
- `src/pages/superadmin/SuperAdminSettings.jsx`

Added:

- `backend/scripts/auditCmsSecurityRegressionTest.js`
- `backend/scripts/publicCmsWiringRegressionTest.js`
- `src/hooks/usePublicWebsiteSection.js`
- `RELEASE_REPORT.md`

## 8. Release gate

The source-level regression gate is **PASS** for the available test suite.

The overall production-release gate remains **NOT VERIFIED** because the environment could not install the project dependencies and could not execute authenticated browser E2E tests. This report intentionally does not convert those gaps into a false production PASS.
