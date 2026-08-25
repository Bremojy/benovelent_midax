# Benevolent MIDAX Auth & Performance Update

## Authentication loop fix
- REST `/auth/me` is authoritative for browser authentication.
- Background `/auth/me` and `/auth/csrf` failures no longer force a full-page redirect after a newer login has started.
- Socket.IO authentication failures no longer clear the REST session. The socket reconnects; REST authentication remains authoritative.
- Login immediately updates the active-browser account marker, so a second account in another tab can safely replace the first browser-origin session.
- Session verification runs every 2 minutes only while the page is visible.
- Transient GET failures can retry once (excluding auth bootstrap requests).

## Local development
Use an LTS Node release (Node 22 LTS is recommended). If `node_modules` is corrupted, remove it and reinstall:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm cache verify
npm install
npm run dev
```

Backend:

```powershell
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm cache verify
npm install
npm run dev
```

## Production API routing
Vercel uses the same-origin `/api/*` rewrite to Render so browser authentication cookies remain tied to the Vercel site origin. Keep the frontend deployment's API URL empty or let the app select same-origin automatically.

## Redis
Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Render. Redis is optional and fails open. Website/assistant caching improves repeated read performance without making Redis a hard dependency.

## Secrets
Never commit live MongoDB, Cloudinary, Resend, TextBee, JWT or M-PESA secrets. Rotate any production secrets that were previously shared outside the deployment environment.
