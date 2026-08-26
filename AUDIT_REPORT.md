# Benevolent MIDAX Deep Audit & Fix Report

Date: 26 August 2026

## Scope

Reviewed the complete React/Vite frontend, Express/Mongoose backend, routing, authentication/session flow, M-PESA STK/B2C paths, notifications/web push, uploads, Cloudinary integration, Redis cache integration, PWA/media loading, page parity and deployment configuration.

The deployed Vercel homepage was also externally checked. The available live inspector can fetch/render the public deployment shell but cannot submit interactive login forms; direct container DNS access to Vercel/Render was also unavailable, so authenticated click-by-click live testing was not falsely represented as completed.

## Confirmed fixes

1. Production REST API now uses the Vercel same-origin `/api` rewrite on `*.vercel.app`, avoiding the previous frontend hard-coded Render REST origin for authenticated browser requests.
2. The frontend M-PESA button now uses the canonical `/api/payments/stk` path only; the old direct-Render fallback was removed.
3. The backend exposes `/api/payments/stk`, `/api/payments/stkpush` and `/api/payments/mpesa-stk` aliases for compatibility with older clients.
4. The VAPID public-key endpoint no longer requires authentication because the public key is safe to expose and the browser subscription bootstrap should not depend on a protected GET.
5. Redis/Upstash caching was wired into high-traffic public content: carousel, leaders, website content/settings/gallery/constitution, public policies and latest news. Cache invalidation is triggered on relevant admin mutations.
6. `/api/health` now reports Redis enabled/connected state alongside MongoDB status.
7. Cloudinary uploads now classify files as `image`, `video` or `raw`; PDFs and office documents are stored as Cloudinary raw assets instead of relying on local Render storage.
8. Existing local constitution PDF references are automatically migrated to Cloudinary on the first constitution fetch when Cloudinary is configured, then the MongoDB content record is updated to the Cloudinary URL.
9. Vercel now sends long-lived caching headers for fixed background videos and sensible caching for documents.
10. The service worker cache-streams fixed background videos on first use, making repeat visits faster without downloading all videos during PWA installation.
11. Background video playback is disabled on Save-Data/2G-class connections so the poster/content appears without waiting for multi-megabyte video assets.
12. Frontend environment examples were corrected so `VITE_API_URL` remains blank for Vercel same-origin API proxying. Socket.IO remains pointed at the Render backend because realtime authentication uses a short-lived socket ticket.
13. A missing root `.env.example` was added; the existing production configuration contract test now passes.

## Page/route findings

- All lazy-loaded React pages referenced by `App.jsx` exist.
- All dashboard menu paths map to existing routes.
- A static navigation scan found no literal internal navigation link targeting an unregistered application route.
- The backend route contract test found 290 backend route contracts and matched 149 frontend API calls.
- The codebase contains both route aliases and redirects for legacy paths rather than leaving known function paths orphaned.

## Automated verification

`npm test` PASSED, including:

- security contract
- source quality
- static integrity
- route contracts
- portal UI contract
- page parity
- call flow
- call/auth regression
- verification flow
- member database contract
- portal shell
- regression audit
- presence
- community M-PESA contract
- production configuration

## Build note

The source-level test suite is green. A local Vite production build could not be executed in this uploaded runtime because its bundled `node_modules` is missing the optional native Rolldown binding (`@rolldown/binding-linux-x64-gnu`). Attempts to repair the dependency tree with npm install/ci timed out in this environment. This is an environment/package-install issue, not a source route/test failure. The ZIP intentionally excludes `node_modules`; Vercel/Render should install from the committed lockfiles.

## Redis configuration gap

The application already supports Upstash Redis REST without adding a native Redis client. Populate these backend variables on Render:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `REDIS_KEY_PREFIX=benevolent-midax:v1`
- `REDIS_TIMEOUT_MS=1200`

If the variables are absent, the cache safely degrades to MongoDB/database reads instead of breaking pages.

## M-PESA configuration gap

STK cannot be made live merely by setting `MPESA_ENABLED=true`. The Render backend must have valid Daraja credentials, passkey, merchant shortcode and HTTPS callback URL. The default manual payment details remain PayBill `247247`, account `0650186528835` as requested; these are separate from the Daraja application shortcode used by STK.

B2C remains deliberately disabled until the production initiator/security credential and Safaricom-approved callback configuration are supplied.

## Storage

Member/admin/superadmin account records use the existing Mongoose models and role-specific collections. Uploaded profile images, member documents, support files, gallery, carousel, leader and message assets route through the Cloudinary upload middleware when Cloudinary is configured. The constitution migration closes the remaining canonical local-PDF path for the public constitution content.

Bundled UI assets such as the default avatar, placeholder SVGs, favicon, app icons and fixed background videos remain Vercel static assets; these are application assets rather than user-uploaded records.
