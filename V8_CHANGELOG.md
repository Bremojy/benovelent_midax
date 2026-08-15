# V8 CHANGELOG — Benevolent MIDAX

## Phase 1 — UX / device behavior
- Removed Events and Resources from the public navbar.
- Kept `/events` and `/resources` as backwards-compatible redirects into the Newsroom.
- Reworked the MIDAX Assistant so it is intentional: no scroll/pointer/keyboard wake-up, no automatic compact-mode transformation.
- Reworked PWA install UI so the Install action is user-invoked from the dashboard topbar. Direct browser install uses `beforeinstallprompt`; iOS/other fallback guidance only appears after the user taps Install.
- Improved dashboard mobile sidebar initialization and topbar behavior.

## Phase 2 — Public website
- Merged News + Events + Resources into a single responsive Newsroom page with tabs.
- Added upcoming activities cards and document/resource download cards.
- Added query-string routing (`/news?tab=events`, `/news?tab=resources`) for old links/bookmarks.
- Added responsive newsroom toolbar, cards, resource list and event cards.

## Phase 3 — Performance / accessibility foundation
- Added V8 responsive foundation stylesheet with 320px hardening, reduced motion support, focus-visible states, touch sizing and mobile dashboard improvements.
- Reduced News hero video preload from `auto` to `metadata` while retaining poster fallback.
- Added layout containment / overflow protections for dense grids and tables.
- Added a stronger PWA install bottom-sheet pattern with safe-area support.

## Phase 4 — Platform / SuperAdmin
- Expanded the approved assistant knowledge context to include published website content and public resource inventory, not only News + Events.
- Added `news`, `events`, `resources`, and `chatbot` website-content sections to the backend model/controller defaults.
- Extended SuperAdmin Website Editor to manage the new content section inventory.
- Preserved existing event APIs, document APIs, news APIs, chat/call infrastructure, authentication and role boundaries.

## Compatibility notes
- Existing public `/events` and `/resources` routes are redirects, so bookmarks do not break.
- No member/admin/superadmin data model was removed.
- The V8 build is intended to be tested with installed dependencies and production environment variables before deployment.
