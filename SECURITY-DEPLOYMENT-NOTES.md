# Benevolent MIDAX 12.0.0 — Security/Deployment Notes

## Browser authentication
The active web frontend no longer stores bearer/JWT tokens in `localStorage` or `sessionStorage`. Authentication uses the backend `HttpOnly` cookie `benevolent_access` with a CSRF-protected write path.

Production cross-origin cookie authentication requires HTTPS on both deployed endpoints, `credentials: true` CORS support, and the exact Vercel origin in `CORS_ORIGINS`.

## Render/backend environment
Use these values in the backend environment (replace only values that are deployment-specific):

```env
NODE_ENV=production
JWT_EXPIRES_IN=30m
ALLOW_LEGACY_BEARER_RESPONSE=false
ALLOW_VERCEL_PREVIEWS=false
CORS_ORIGINS=https://benovelent-midax.vercel.app
```

Keep `MONGO_URI`, `JWT_SECRET`, Cloudinary, email, SMS and VAPID secrets only in the backend/Render environment. Never place them in a Vite `VITE_*` variable.

## Compatibility
The backend still accepts a bearer token for controlled legacy/non-browser clients, but normal browser login does not return a bearer token unless `ALLOW_LEGACY_BEARER_RESPONSE=true` is deliberately enabled.

## Verification performed
The included test suite passes the security, source quality, static integrity, route, portal UI, call-flow, shell and regression contracts. Backend CommonJS syntax was also checked. Local production Vite build execution could not be completed in this environment because the uploaded dependency tree did not contain runnable Vite binaries; no application source was considered build-verified on that basis.
