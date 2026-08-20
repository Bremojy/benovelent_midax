# Benevolent MIDAX V15 update

## Safety-first verification
The previous V14/V13 package was checked before modification. Existing route, UI, and portal-shell contracts were preserved.

## Fixed
- Fixed the MIDAX Assistant backend crash caused by a missing `WebsiteContent` model import.
- Updated the dashboard chat preview to use the shared authenticated Axios client instead of always sending a member token.
- Isolated assistant chat history by role and portal section so a reused browser session cannot surface another portal's assistant history.
- Added a 9-second assistant fallback timeout so the chatbot remains responsive during slow backend/Render cold starts.
- Kept the existing fixed mobile bottom navigation and shell behavior unchanged.
- Added a dependency-free regression test for the above fixes.
- Corrected the local static source-quality gates so the unused legacy `backend/src` frontend copy and `backend/vite.config.js` are not mistaken for CommonJS backend runtime files.

## Verification after changes
Passed:
- SOURCE QUALITY TEST
- STATIC INTEGRITY TEST
- ROUTE CONTRACT TEST
- V12 UI CONTRACT TEST
- V13 PORTAL SHELL TEST
- REGRESSION AUDIT

A full Vite production build was not claimed because dependency installation in the sandbox was blocked by the execution environment; the delivered project does not include a partial `node_modules` directory.
