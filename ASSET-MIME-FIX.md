# Benevolent MIDAX — Asset MIME / Vercel Routing Fix

## Problem fixed
The SPA catch-all rewrite could match `/assets/*`. A missing or incorrectly resolved Vite asset such as `/assets/index-*.js` could therefore be rewritten to `/index.html`, causing the browser error:

`Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html".`

## Changes
- `/assets/*` is explicitly excluded from the SPA HTML fallback.
- `/api/*` remains excluded from the frontend fallback.
- Static PWA files are excluded from the SPA fallback.
- Vite continues to build into `dist/`, then the Vercel build copies the complete output to `vercel-output/`.
- Added `scripts/verify-vercel-assets.mjs` to guard the routing contract in future updates.

## Important deployment note
Redeploy the updated source on Vercel. Do not upload an old `dist/` folder manually. Vercel must run `npm run vercel-build` so the hashed files referenced by the new `index.html` are deployed together.
