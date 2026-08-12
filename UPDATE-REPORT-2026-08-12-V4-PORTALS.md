# Benevolent Midax — Portal & SuperAdmin Governance Update

## SuperAdmin Database Integrity & Cleanup
- Added a SuperAdmin control room connected to the live MongoDB database through protected backend endpoints.
- Added deep carousel scanning: public/Cloudinary image URLs can be hashed with SHA-256 so legacy duplicate image uploads can be detected even when their URLs differ.
- Carousel duplicate cleanup keeps the newest copy and removes only confirmed duplicates.
- Carousel cleanup is available even when the current report says zero duplicates, so the action is never disabled merely because the prior scan missed a legacy duplicate.
- Added direct cleanup controls for self-conversations, orphaned conversations/messages and legacy personal monthly-income fields.
- Added database backup of all MongoDB collections with credential/token fields redacted.
- Added full database print view for live records with credential/token fields redacted.
- Added clickable live-snapshot controls and an explicit SuperAdmin control room.
- Safe Cleanup can be run on demand even when the current report is clean.

## Dashboards
- Admin Dashboard: live online members, pending support by category, unread notifications, published news, active feedback, feedback responses and quick links.
- Member Dashboard: personal contribution/dependent/message/notification/pending-support activity plus quick links; personal monthly income remains excluded.
- SuperAdmin Dashboard: cross-portal member, leadership, support, finance, communication and content activity with governance quick links.

## Add Administrator UI
- Modernized the administrator creation/edit modal with improved spacing, focus states, rounded inputs, responsive layout, improved buttons and visual hierarchy.

## Validation
- Every backend JavaScript file passes `node --check`.
- `package.json` and `package-lock.json` parse successfully.
- The supplied npm registry setting is invalid (`https:///`), so a fresh npm/Vite production build cannot be executed until npm uses a valid registry. `node_modules` was deliberately excluded from the distributable ZIP so deployment uses a clean `npm install`.
