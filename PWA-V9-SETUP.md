# Benovelent MIDAX V9 — PWA & Phone Notifications

## Render environment variables

Configure Web Push on the backend with:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (for example `mailto:admin@midax.co.ke`)

The public key is served to authenticated portals through `/api/notifications/push/vapid-public-key`. Each user enables notifications once from Portal Settings.

## Phone call notifications

V9 sends an OS-level Web Push notification for incoming audio/video calls when the browser/PWA is permitted to receive push notifications. The notification uses vibration and Answer/Decline actions where the operating system/browser supports them. Opening/answering a web call still requires the browser to grant camera/microphone access; the browser cannot be forced to grant that permission automatically.

## PWA install

The install prompt now remains visible on mobile when the browser exposes `beforeinstallprompt`, and a phone-specific install guide is available when the browser does not expose that event. iOS uses Safari's Add to Home Screen flow.
