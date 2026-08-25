# Benevolent MIDAX — Revision 2

This revision addresses the audit findings from the frontend/backend/M-PESA review.

## Applied
- Removed bundled `node_modules`, `.git` metadata and stale `dist` from the release package.
- Updated release version to 18.1.0 across package metadata and version contract tests.
- Updated the actual `.env` and `backend/.env` files as requested.
- Added explicit `MPESA_B2C_ENABLED` gating.
- Added `/api/payments/route-status` for safe deployment/payment-route diagnostics.
- Added machine-readable `ROUTE_NOT_FOUND` API responses.
- Restricted the frontend M-PESA direct-backend fallback to genuine route misses only.
- Distinguished a Safaricom/Daraja HTTP 404 from an application-route 404 and return `MPESA_DARAJA_404` with HTTP 502.
- Centralized M-PESA endpoint definitions in the backend payment service diagnostics.
- Preserved the existing production STK credentials/configuration already present in `backend/.env`.
- Kept B2C disabled until the real production Safaricom `MPESA_INITIATOR_NAME` and `MPESA_SECURITY_CREDENTIAL` are installed.

## Verification
- JavaScript syntax checks passed for all modified backend files.
- Security, source-quality, static-integrity, route, portal UI, page parity, call flow, call/auth, verification, member DB, shell, regression, presence, community M-PESA and production-config tests passed.
- Existing test suite reports 290 backend route contracts and 149 frontend API calls.

## Important deployment requirement
Run a fresh dependency installation (`npm ci`) in the root project before the Vite production build. Dependencies are deliberately not included in this release ZIP so Windows-native modules cannot contaminate Linux/Vercel builds.

B2C cannot be made genuinely live by source code alone: Safaricom must provide the production InitiatorName and SecurityCredential for the Daraja app/account.
