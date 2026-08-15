# Benevolent MIDAX V9 Changelog

## Phase 1 — Portal/mobile UX
- Mobile portal bottom navigation is now shown only on the Member/Admin/SuperAdmin dashboard home.
- Portal subpages use a proper mobile side drawer instead of a persistent bottom navigation bar.
- Chatbot no longer permanently occupies the bottom-right control area. It uses a temporary assistance teaser and closes cleanly.
- On portal dashboard home, the assistant is offset above the bottom navigation.
- Dashboard topbar remains compact on phones.

## PWA install
- The dashboard Install control now requests the browser-native PWA install prompt directly when the browser exposes it.
- iOS/unsupported browser environments receive a compact fallback notice rather than a persistent instruction panel.

## Form modernization
- Added a shared V9 form system for Member, Admin and SuperAdmin data-entry screens.
- Inputs, selects, textareas, file controls, focus states, disabled states and mobile sizing are standardized.
- Two-column desktop forms collapse to one column on smaller screens.

## Validation
- Frontend JS/JSX syntax validated with the locally available TypeScript parser.
- Backend JavaScript checked with `node --check`.
- Existing application functionality and route structure were preserved.
