# Benevolent MIDAX — Responsive V1 Update

## Updated
- Added a unified modern responsive layer for desktop, tablet and mobile layouts.
- Improved public navigation, hero sizing, forms, cards, dashboard shell, sidebar, topbar, chat surfaces and modal sizing.
- Added safe-area support and iOS-friendly 16px input sizing to prevent unwanted mobile browser zoom.
- Improved mobile navigation and portal spacing without changing portal route structure.
- Made the login video honor `VITE_LOGIN_VIDEO_URL` with the existing local login-video fallback.
- Made API timeout configurable through `VITE_API_TIMEOUT` (default 20 seconds).
- Added a backend/frontend route contract test: `npm run test:routes`.
- Updated `.env.example` asset examples to match files bundled in `public/`.

## Validation completed
- `node backend/scripts/staticIntegrityTest.js` — PASSED.
- `node backend/scripts/routeContractTest.js` — PASSED.
- Offline frontend JSX/JS syntax validation using the installed TypeScript parser — PASSED (119 files, 0 syntax errors).

## Environment note
The local dependency tree in the inspection environment had filesystem permissions that prevented a clean `npm ci`/Vite build here. The source itself passed syntax validation; run `npm ci` and `npm run build` in your development/CI environment before deployment.
