# Benovelent MIDAX V9 — Finalisation

- V8 contribution/account model retained.
- Mobile/desktop PWA install prompt hardened with visible Install action and browser-specific guidance.
- Service worker cache advanced to v9.
- Added phone push call notifications with vibration, persistent call-style alerts and Answer/Decline actions where supported; call notifications carry the live WebRTC offer into the PWA handoff.
- Pending incoming-call payloads are stored in IndexedDB so a push-opened call can be handed into the chat centre.
- Removed internal privacy/control wording from member account and general page copy; the member scheme ledger is aggregated so personal contribution rows/names are not exposed.
- Reduced duplicate online/administrator status presentation in portal dashboards.
- Existing Cloudinary storage, CORS, authentication, accounts, data-integrity, carousel cleanup, feedback and PWA foundations retained.
