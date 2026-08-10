# Benevolent Midax — Mobile / Chat / Audit Update

## Changes made

### Mobile responsiveness
- Added global mobile-width hardening to prevent desktop components/assets from widening the phone viewport.
- Added safe `100dvh` handling for the mobile chat fullscreen overlay.
- Hardened chat containers against horizontal overflow.
- Updated profile upload previews to preserve the original image proportions instead of cropping them with `object-fit: cover`.
- Updated admin member uploaded-image previews to preserve portrait/landscape proportions.
- Made portal table containers self-contained horizontally so tables no longer widen the whole page.

### Instagram-like chat composer
- Rebuilt the message composer around a rounded Instagram-style message pill.
- Added camera, emoji, photo, voice-note, send, and more-attachment actions.
- Added a compact attachment menu for files/media.
- Added a real image thumbnail preview before sending.
- Added mobile safe-area padding and smaller touch targets/layout for narrow screens.
- Improved image messages so the full uploaded image is visible instead of being cropped.

### SuperAdmin Audit
- Fixed the Audit summary field mismatch (`todayLogs` vs `today`, plus creates/updates/failed/successful counts).
- Added an audit coverage endpoint that returns every current Member/Admin/SuperAdmin account, including people with zero audit records.
- Added explicit constitution leadership coverage for:
  - Chairperson — Moses Machila
  - Treasurer — Immaculate
  - Secretary — Isabela
- Added matching status for the constitution leadership names against live admin accounts.
- Added searchable/filterable account coverage on the SuperAdmin Audit page.
- Kept recent action logs as a separate detailed section.
- Fixed the legacy audit service so any future callers provide the required audit actor fields.

## API / code checks performed
- Backend JavaScript syntax check: **0 failures** across backend `.js` source files.
- Frontend-to-backend API route static check: **135 API calls checked, 0 missing/mismatched route matches**.
- Modified CSS/JSX files checked for balanced syntax delimiters.

## Build note
A production Vite build could not be executed in this sandbox because the uploaded project dependencies were Windows-specific and the environment could not reinstall one npm package from its configured registry (`xmlhttprequest-ssl` returned 404). The source-level API and backend syntax checks above were completed successfully.

## Packaging
- The updated ZIP excludes `node_modules`, `.git`, and local `.env` files.
- `.env.example`, source code, documents, public assets, package files, and the constitution PDFs are retained.
