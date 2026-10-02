## 18.5.2 — 2026-10-02

- Replaced the invalid `Instagram` import from `lucide-react` with a lightweight inline Instagram SVG in the existing footer.
- Added a pre-build Lucide export compatibility audit that checks installed exports when dependencies are available and blocks known social-brand imports.
- Added a footer build regression contract covering the official WhatsApp/Instagram destinations, single footer mount, and reload-free error recovery.
- Replaced the error-boundary page reload fallback with an in-place view reset to avoid reload hacks.

# Changelog

## 18.5.1 — 2026-10-01

- Unified direct-chat authorization around active + viewer-specific deleted lifecycle rules.
- Reopened stale/legacy direct conversations now reuse the canonical participant pair and restore `active=true` without deleting data.
- Added stale-conversation frontend repair for message history and message send/retry, preserving `X-Idempotency-Key` / `clientMessageId`.
- Added server-authoritative `crypto.randomUUID()` call IDs.
- Added remote-call audio autoplay recovery with an explicit “Enable call audio” control.
- Added ICE restart recovery for disconnected/failed calls before ending the session.
- Added an explicit single-instance Socket.IO call-state deployment contract.
- Added `test:chat-realtime-call`, `test:chat-lifecycle-call-repair`, and `diagnose:calling` release checks.
- Adjusted Smart Assistant positioning while a chat is active so it does not obscure the composer/call controls.
