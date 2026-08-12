# Benevolent Midax V1 — Realtime, Data Integrity & Reliability Update

## Fixed
- Removed the invalid unique MongoDB index on `members.nextOfKin.phone`, which caused `E11000 ... nextOfKin.phone_1 dup key: { nextOfKin.phone: "" }` when creating multiple members with an empty next-of-kin phone.
- Added a startup database migration runner and schema migration record.
- Fixed `Admin is not defined` in `adminController.createMember`.
- Member creation now converts Mongo duplicate-key errors into a useful API response instead of a generic server error.
- Permanent account deletion continues to remove linked chat and account data while preserving the SuperAdmin account.
- Realtime presence is multi-tab safe and includes an actual last-seen timestamp.
- Added missed audio/video call notifications and web-push alerts.
- Incoming calls now use stable user IDs instead of ephemeral socket IDs for answering/ending, allowing push-opened calls to route back to the caller.
- PWA push notifications are role-aware for Member/Admin/SuperAdmin message portals.
- Message notifications increment unread counts and are delivered through Socket.IO + Web Push.
- Chat UI now displays last-seen date/time rather than date-only.

## Verification performed in this package
- Node syntax checks are intended for every backend `.js` file.
- Frontend production build can be run with `npm ci && npm run build` in the project root.
- Backend production dependency check can be run with `npm ci` in `backend`.

## Deployment
1. Deploy backend first and confirm migrations run once in Render logs.
2. Confirm `nextOfKin.phone_1` is dropped from the MongoDB member collection.
3. Rebuild/deploy the Vercel frontend.
4. On each phone, open Portal Settings and enable browser notifications; install the PWA for the most reliable mobile notification behavior.
5. Test: member creation, duplicate credentials, message send/receive, missed call, answer/decline call, offline push notification, and last-seen timestamps.

## Test result in this environment
- `node backend/scripts/staticIntegrityTest.js` passed. It checked 116 backend JavaScript files plus critical PWA/realtime/migration files.
- Individual `node --check` validation passed for the modified backend, migration, socket and service-worker files.
- A full Vite production build and a live Render end-to-end browser test could not be completed in this environment because the uploaded dependency trees were incomplete and external package installation/live network resolution was unavailable. No claim of a successful `vite build` is made here.
