# Benovelent Midax — Audit & Fixes — 12 Aug 2026

## Fixed
- Admin member update no longer fails when optional `gender` / `maritalStatus` arrive as empty strings. The schema accepts an explicit blank state and the admin update path preserves the existing value when a blank value is submitted.
- Removed personal member `monthlyIncome` collection from the member model and profile UI, removed the admin support display, and excluded the legacy field from member reads.
- Added a SuperAdmin Data Integrity cleanup that unsets legacy `monthlyIncome` fields from existing Member documents without touching finance ledger `income` transactions.
- News category handling now normalizes frontend values such as `event` / `announcement` to the schema's canonical values, preventing Mongoose enum 500 errors.
- Feedback duplicate submission remains correctly protected with HTTP 409, but the member UI now presents a friendly already-submitted message.
- Feedback admin/SuperAdmin responses were redesigned into modern response cards with respondent state, submission time, question labels, and readable answers instead of raw JSON blocks.
- Feedback page now has visible Back and Home navigation controls.
- Cookie consent was changed to a compact floating card instead of a wide page-spanning banner.
- PWA install prompt was changed to a compact floating install card with a real install action and dismiss persistence.
- Backend CORS was made explicit for the Benovelent Vercel frontend and local development origins.
- Backend startup now binds the Render port before MongoDB connection completes and retries MongoDB connection, reducing Render 502/connection-closed behavior during cold starts or transient DB failures.
- Education, funeral, and medical support document URLs now use the Cloudinary-aware stored-file resolver instead of hard-coded local `/uploads` paths.
- Added `backend/.env.example` with the required CORS/Cloudinary/notification variables.
- Existing live `.env` files from the supplied archive were excluded from the updated ZIP to avoid redistributing secrets.

## Verification performed
- Node syntax checks passed for all modified backend controllers/server.
- Route inventory was compared against the frontend API service usage; the reported notification/news/feedback routes exist in the backend, with route-order conflicts checked for `public`/parameterized paths.
- Cloudinary upload middleware and all identified support upload consumers were audited.

## Environment limitation
The supplied environment has an invalid global npm registry configuration and dependency installation could not complete reliably, so a full Vite production build could not be executed in this container. The source was still statically audited and backend syntax-checked.
