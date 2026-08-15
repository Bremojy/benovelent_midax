# Benevolent MIDAX — Production Audit V16

## Scope
This release audits and patches the uploaded React/Vite frontend and Node/Express/MongoDB/Socket.IO backend while preserving the existing feature set and responsive phone/desktop architecture.

## Verified
- Backend JavaScript syntax: 120/120 files passed `node --check`.
- Backend static integrity test: PASS.
- Frontend relative-import scan: no missing local module targets found.
- Production environment secrets are not packaged in this archive.
- Existing API route surface was cross-checked between frontend service calls and backend route definitions.
- Live backend root endpoint responded successfully during the public deployment audit.
- Vercel frontend was reachable during the public deployment audit.

## Patches
- Added failed-login counting and a temporary lock after repeated invalid credentials.
- Restricted notification creation to Admin/SuperAdmin roles.
- Restricted notification read/delete/detail access to the authenticated recipient.
- Added notification pagination/caps and `lean()` reads to avoid unbounded notification payloads.
- Added recipient/time notification indexes for common dashboard queries.
- Removed a redundant SuperAdmin email index declaration.
- Deduplicated broadcast email recipients and added bounded parallel sending batches.
- Updated PWA service-worker registration to bypass HTTP cache when checking the worker for updates.
- Bumped the service-worker cache version so installed PWAs can receive this release.
- Removed hardcoded setup passwords from `backend/createAdminAccounts.js`; initial passwords are now supplied through environment variables and are documented in `backend/.env.example`.

## Important production configuration
The backend must keep its secrets in the hosting provider's environment-variable store, not in Git or ZIP archives. For Resend, use a sender address on a domain verified in Resend before using it as the production `From` address.

## Live-login limitation
This audit could not perform interactive browser clicks against the production login portals because this environment has no interactive browser-control session. The public backend health/root response and source/API configuration were still audited, and live credential authentication should be included in the final deployment acceptance test.

## Deployment notes
After deploying this release:
1. Set all backend secrets in Render.
2. Set `VITE_API_URL` and `VITE_SOCKET_URL` in Vercel.
3. Deploy and confirm `/api/health`.
4. Test Member, Admin, and SuperAdmin logins, chat/calling, push notifications, uploads, broadcasts, support claims, finance, and PWA installation on phone and desktop.
