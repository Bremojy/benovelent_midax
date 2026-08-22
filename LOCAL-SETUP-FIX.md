# Benevolent MIDAX V15 — Local setup

## Fix for `vite is not recognized`
Run these commands in PowerShell from the folder containing the root `package.json`:

```powershell
cd C:\Users\brian\benevolent-midax
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci --include=dev --no-audit --no-fund
npm run dev
```

If the machine uses a production `NODE_ENV` and devDependencies are omitted by your npm configuration, the `--include=dev` flag is required.

## After deployment
1. Open the production site in an Incognito/InPrivate window.
2. Hard refresh once.
3. If an old PWA is still installed, unregister the old service worker or remove the installed site/app once, then reload. V15 automatically retires the previous Benevolent shell cache after the new service worker activates.
4. In DevTools > Network, `index-<hash>.js` must return `200` with a JavaScript content type, not `text/html`.
