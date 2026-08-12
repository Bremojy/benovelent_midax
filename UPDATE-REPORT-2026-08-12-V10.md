# Benovelent MIDAX V10 — Final Polish

## Install prompt
- Fixed the close (X) button so dismissing the compact install prompt actually removes it.
- Preserved the existing install action, mobile help flow, and browser-native install behavior.
- Added touch-friendly hit targets for the close/help controls.

## Performance and comfort
- Service-worker cache advanced to V10.
- API, authentication, and realtime requests are explicitly excluded from the static asset cache to prevent stale dashboard/account data.
- Static assets use cache-first behavior for faster repeat navigation.
- Document navigation remains network-first with cached fallback for resilience during temporary offline periods.

No portal data model or role permissions were changed in V10.
