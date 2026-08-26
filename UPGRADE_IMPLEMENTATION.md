# Benevolent MIDAX v18.2.0 Upgrade

## Applied changes

### Core / security / correctness
- Fixed the real `MEMBER_STATUS is not defined` eligibility runtime defect.
- Eligibility now checks the logged-in member's actual status against `MEMBER_STATUS.ACTIVE`.
- Added strict member-profile validation for Kenyan mobile numbers, national IDs, bank account numbers, email, dates and text fields.
- Members can now update `fullName` while the server still protects employer/position fields as MIDAX-controlled values.

### Redis / performance
- Preserved fail-open Upstash Redis behavior.
- Added namespace invalidation so public news list variants can be invalidated after news writes.
- Kept cached public website content, gallery, constitution, leaders, carousel, latest news, notifications, member dashboard and finance responses.
- Added dependency/admin invalidation hooks for member dashboard and current leadership caches.

### Public website
- Added `GET /api/leaders/current`, which combines active administrator and SuperAdmin records into the current leadership directory.
- Public leadership response exposes only intended contact/profile information.
- Home now renders live leadership cards with profile photos and phone/email links.
- Expanded public quick access cards for leaders, gallery, constitution, contact, membership verification and secure portal login.
- Existing public news/carousel caching remains active.

### Member portal
- Main member navigation is streamlined. Notifications, Announcements and Benefits remain accessible as secondary portal pages instead of occupying the main navigation.
- Member Dependents CRUD remains active, with cache invalidation on add/update/remove.
- Generic member support requests now require at least two supporting documents from different categories.
- `Other` documents require a clear label.
- Generic support requests can be edited or deleted only while exactly in `Under Review` stage.
- Added member UI actions/modal for generic support request editing/deletion and document-category relabelling while Under Review.

### Admin portal
- Added site-station filtering to the Admin Members search flow.
- Admin financial users can still add/edit transactions but cannot permanently delete them.
- Permanent financial deletion is now SuperAdmin-only at both routing and controller layers.
- Admin News & Communications points to the existing multipart news API, which supports cover images, additional images and attachments.

### SuperAdmin portal
- Removed Chat from the SuperAdmin navigation and replaced the old `/superadmin/messages` entry with a safe redirect to `/superadmin`.
- Added Feedback visibly to SuperAdmin navigation while retaining the existing full-control feedback page and API permissions.
- Existing SuperAdmin full-control accounts/claims/support/news/audit/data-integrity/system capabilities are preserved.

## Environment synchronization
The source release is `18.2.0`.

Set these in the actual deployment environments:

```env
APP_VERSION=18.2.0
VITE_APP_VERSION=18.2.0
```

Do not place backend secrets in the frontend environment.

## Production secret rotation
The credentials pasted into the conversation must be treated as exposed. Rotate at minimum:

- `MONGO_URI` database password
- `JWT_SECRET`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `TEXTBEE_API_KEY`
- `UPSTASH_REDIS_REST_TOKEN`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `VAPID_PRIVATE_KEY`

Keep the rotated values only in Vercel/Render environment settings or an approved secret manager.

## Required deployment configuration

### Render backend
Keep/set:

- `NODE_ENV=production`
- `PORT=5000`
- `MONGO_URI=<rotated MongoDB connection string>`
- `JWT_SECRET=<rotated secret>`
- `JWT_EXPIRE=7d`
- Cloudinary variables
- Resend variables
- TextBee variables
- VAPID variables
- Upstash Redis variables
- Daraja M-PESA variables
- `MPESA_B2C_ENABLED=false` until production B2C initiator/security credentials are supplied
- `CORS_ORIGINS=https://benovelent-midax.vercel.app,http://localhost:5173,http://127.0.0.1:5173`
- `ALLOW_VERCEL_PREVIEWS=false`
- `APP_VERSION=18.2.0`

### Vercel frontend
Keep/set only frontend-safe variables:

```env
VITE_API_URL=/api
VITE_SOCKET_URL=https://benovelent-midax.onrender.com
VITE_SOCKET_UPGRADE=true
VITE_API_TIMEOUT=20000
VITE_APP_VERSION=18.2.0
VITE_LOGIN_VIDEO_URL=/videos/benevolent-login-loop.mp4
VITE_ABOUT_VIDEO_URL=/videos/benevolent-community-loop.mp4
VITE_CONSTITUTION_VIDEO_URL=/videos/benevolent-community-loop.mp4
VITE_GALLERY_VIDEO_URL=/videos/benevolent-gallery-loop.mp4
VITE_NEWS_VIDEO_URL=/videos/benevolent-news-loop.mp4
VITE_CALL_RINGTONE_URL=/sounds/benovelent-call.mp3
VITE_MPESA_SHORTCODE=650014
VITE_MPESA_ACCOUNT_REFERENCE=BENMIDAX
VITE_MPESA_MANUAL_PAYBILL=247247
```

Do not copy `MONGO_URI`, `JWT_SECRET`, Cloudinary secret, Resend key, TextBee key, Redis token, M-PESA consumer secret/passkey, or VAPID private key into Vercel frontend variables.

## Validation performed

The following passed after the upgrade:

- backend JavaScript syntax validation: all 160 backend files
- security contract test
- source quality test
- static integrity test
- route contract test
- portal UI contract test
- page parity test
- call flow contract test
- call/auth regression test
- chat contract test
- verification flow contract test
- member database contract test
- portal shell test
- regression audit
- presence contract test
- community M-PESA contract test
- production configuration contract test
- M-PESA callback/query contract test
- new upgrade contract test

A fresh Vite production build was not claimed because the ZIP does not contain `node_modules`; network dependency installation was not completed during this audit. Run `npm ci` and `npm run build` in your deployment/CI environment before release.

## Deployment commands

Frontend/root:

```bash
npm ci
npm run test
npm run test:upgrade
npm run build
```

Backend:

```bash
cd backend
npm ci
npm start
```

For Render, use the backend directory as the service root if your Render service is configured that way. For Vercel, keep the project root and the existing `vercel.json` rewrite architecture.

## Live smoke test after deployment

Test in this order:

1. Public Home → leadership cards load from `/api/leaders/current`.
2. Login → `/api/auth/me` succeeds without a 401 loop.
3. Member → Profile → save validation and updates.
4. Member → Dependents → add/edit/remove, then open Support.
5. Member → Support → upload two different categories and submit.
6. Move a generic support request to `Under Review`, then test Edit/Delete; move it beyond `Under Review` and confirm both actions are rejected.
7. Admin → Members → search + site-station filter.
8. Admin → Accounts → add/edit; confirm no Delete button exists.
9. SuperAdmin → Accounts → confirm Hide/Delete controls.
10. SuperAdmin → confirm Chat is absent and Feedback is present.
11. Chat/calls → verify Socket.IO ticket authentication, presence, notification and ringtone behavior.
12. M-PESA → confirm Daraja STK uses backend production credentials and callback URL.
