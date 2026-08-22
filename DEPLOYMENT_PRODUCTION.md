# Production deployment notes

## Vercel frontend
The frontend now defaults to the same-origin `/api` proxy in production when `VITE_API_URL` is not set. This reduces cross-site cookie/session drift between Vercel and Render.

Recommended Vercel environment variables:

```text
VITE_API_URL=
VITE_API_TIMEOUT=20000
VITE_SOCKET_URL=https://benovelent-midax.onrender.com
VITE_SOCKET_UPGRADE=false
VITE_APP_VERSION=16.0.0
```

Remove any old `VITE_API_URL=https://benovelent-midax.onrender.com` override from Vercel if the goal is to use the same-origin proxy.

## Render backend
Keep these values configured as real secrets/production values:

```text
NODE_ENV=production
CORS_ORIGINS=https://benovelent-midax.vercel.app
ALLOW_VERCEL_PREVIEWS=false
APP_VERSION=16.0.0
```

Also configure MongoDB, JWT, Cloudinary and notification provider credentials in Render only.

## Uploads
Cloudinary remains the preferred production upload backend. The server keeps `/var/data/uploads` and `/var/data/documents` as its local fallback when Cloudinary is unavailable and the host provides persistent storage.

## Canonical website assets
The root `public/` directory is the single bundled frontend asset source. The duplicate `backend/public/` tree was removed.

## Cache/PWA
The service worker keeps its own versioned shell cache. `index.html` remains configured for no-cache deployment behavior so a new Vercel deployment can update the application shell instead of being trapped behind an old HTML response.
