# Benovelent Midax – 2026-08-12 Fix & Audit Report

## Fixed
- Fixed `SuperAdminDashboard.jsx` `ReferenceError: API is not defined` by importing the shared Axios API client.
- Fixed PWA service-worker CacheStorage failures caused by HTTP `206 Partial Content` responses. Range/media requests now bypass caching, and only complete `200` responses are cached.
- Prevented cache-write failures from becoming uncaught promise errors.
- Kept the PWA custom installation prompt user-driven and cleared the prompt lifecycle after the user responds.
- Consolidated chat page Socket.IO usage onto the existing resilient socket client instead of creating a second forced-WebSocket client.
- Added a safe socket connection error handler so chat transport failures do not break normal HTTP dashboard functionality.
- Added a SuperAdmin built-in website-experience feedback launcher with questions covering overall experience, requested features, exhausting/frustrating areas, and what is working well.
- Built-in feedback can be submitted by authenticated users across member/admin/superadmin roles and prevents duplicate submissions per authenticated user.
- Added mobile-only Back button to the feedback page.
- Feedback cards use exactly two columns on desktop and one column on phone/tablet sizes.
- Refined feedback header/actions for phone responsiveness.
- Strengthened numeric form semantics for finance/support/monthly-income fields (`min`, `step`, `inputMode`) while keeping identifiers/reference fields as text because leading zeros/alphanumeric values are valid.

## API / backend validation
- Backend JavaScript syntax check: PASS (`node --check` for all backend `.js` files outside `node_modules`).
- Frontend files using `API` were scanned for missing imports: 31 JSX files use `API`, 0 missing imports after the fix.
- Existing backend route families used by the frontend remain mounted in `backend/server.js`; no backend route files were removed.

## Build-note
The uploaded dependency cache contains Vite/Rolldown packages without the Linux native optional binding required for the production build. Because reinstalling dependencies was not available in this execution environment, a full Vite production build could not be completed here. This is an environment/dependency-cache limitation, not a source-code build error observed from the uploaded code.

Run locally before deployment:
- `npm install`
- `npm run build`
- `cd backend && npm install`
- `cd backend && npm start`

The updated source ZIP excludes `node_modules`, `.git`, and the local `.env` file so secrets are not redistributed. `.env.example` is preserved.
