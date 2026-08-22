# Benevolent MIDAX – Updated Build (22 Aug 2026)

## Included fixes
- Repaired Admin/SuperAdmin bootstrap logic so existing accounts are repaired and passwords synchronized from ADMIN_INITIAL_PASSWORD / SUPERADMIN_INITIAL_PASSWORD when the account setup script runs.
- Added `backend/.env` and root `.env` from the deployment values supplied for this build.
- Added `backend` script: `npm run create:accounts`.
- Added feedback response CSV/JSON export for Admin/SuperAdmin.
- Added feedback CSV/JSON import for Admin/SuperAdmin.
- Added Feedback → News publishing/update workflow.
- Added protected member/authenticated downloads for published feedback reports (CSV/JSON).
- Added print controls for feedback responses and published News reports.
- Added feedback report metadata to News.
- Fixed News attachment schema compatibility with the fields the controller writes.
- Stopped globally forcing `Content-Type: application/json`, allowing FormData uploads to set their own multipart boundary correctly.
- Improved mobile feedback action layout.

## Verification
Passed:
- Static integrity test
- Route contract test
- Source quality test
- Portal UI contract test
- Security contract test
- Regression audit
- Call flow contract test
- Call/auth regression test
- Verification flow contract test
- Member database contract test
- Portal shell test

A full browser/Vite production build was not executed because this source archive does not contain `node_modules` and dependency installation is not bundled into the delivery ZIP.

## Account setup
From `backend/` run:

```bash
npm run create:accounts
```

The setup script reads:
- `ADMIN_INITIAL_PASSWORD`
- `SUPERADMIN_INITIAL_PASSWORD`

It repairs an existing matching account, clears login lock state, activates it, resets `mustChangePassword`, and saves the supplied password through the model's bcrypt hashing hook.
