# Benovelent MIDAX — Updated1

## Included
- Hardened Axios requests for JSON vs multipart/FormData uploads.
- Added configurable API timeout via `VITE_API_TIMEOUT`.
- Added a global React error boundary with recovery actions.
- Added a responsive/performance UI hardening stylesheet.
- Removed duplicate `App.css` import from the React entry point.
- Extended page-navigation transition to 3 seconds with a scissor-style visual cue.
- Hardened CORS for Benovelent Vercel preview deployments without opening arbitrary origins.
- Upgraded `/api/health` to report degraded status with HTTP 503 when MongoDB is unavailable.
- Added friendly handling for malformed JSON and oversized request payloads.
- Preserved existing Cloudinary, PWA, calling, notification and data-integrity functionality.

## Validation notes
- Backend JavaScript syntax is checked with Node.
- A clean frontend build is performed from a fresh dependency install where the environment permits.
- The uploaded `node_modules` directory is intentionally excluded from the delivery ZIP so deployment systems install clean dependencies.
