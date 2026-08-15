# Benevolent MIDAX V10

## Major fixes
- Mobile portal dashboard home navigation now always fits the screen: four key destinations plus a More drawer.
- Portal subpages no longer reserve bottom-navigation space and always provide a Home button back to the role dashboard.
- Member, Admin and SuperAdmin topbar messaging is available consistently.
- Chat assistant is now an intermittent availability teaser/launcher and is lifted above the dashboard bottom bar on mobile; it no longer permanently covers portal controls.
- Install action calls the native PWA prompt directly when the browser exposes `beforeinstallprompt`. Unsupported browsers get only a small dismissible notice.
- Vite public SVG/image fallback URLs remain on the frontend origin instead of being rewritten to Render, preventing CORP/NotSameOrigin failures.
- Vercel missing asset paths return 404 instead of HTML, preventing MIME-type errors for dynamic JS chunks.
- Service worker code assets use network-first and a fresh cache namespace to reduce stale deployment chunks.
- Lazy-loaded portal pages recover once from stale/missing chunks.
- Platform Center events and assistant context are role-safe for member/admin/superadmin.
- Existing V9 responsive form system is preserved.
