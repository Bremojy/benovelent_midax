# Benevolent MIDAX Environment Setup Guide

## 1. Vercel frontend variables

Set:

```env
VITE_API_URL=
VITE_SOCKET_URL=https://benovelent-midax.onrender.com
VITE_SOCKET_UPGRADE=true
VITE_API_TIMEOUT=20000
VITE_MPESA_MANUAL_PAYBILL=247247
VITE_MPESA_ACCOUNT_REFERENCE=0650186528835
```

`VITE_API_URL` must stay blank for the Vercel deployment. The application now calls `/api/...` on the Vercel origin and `vercel.json` rewrites those requests to Render.

Do not put `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, B2C credentials, MongoDB credentials or Cloudinary API secrets in Vercel frontend variables.

## 2. Render backend variables

At minimum configure:

```env
NODE_ENV=production
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<long random secret>
JWT_EXPIRE=7d
CORS_ORIGINS=https://benovelent-midax.vercel.app,http://localhost:5173,http://127.0.0.1:5173
ALLOW_VERCEL_PREVIEWS=true

CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
# or use CLOUDINARY_URL instead of the three values above

UPSTASH_REDIS_REST_URL=<Upstash REST URL>
UPSTASH_REDIS_REST_TOKEN=<Upstash REST token>
REDIS_KEY_PREFIX=benevolent-midax:v1
REDIS_TIMEOUT_MS=1200
```

## 3. Redis / Upstash

Create an Upstash Redis database in your account, copy its REST URL and REST token, and place them only in the Render backend environment.

The website does not fail when Redis is unavailable. Cache calls have a short timeout and fall back to the database. The high-traffic public resources that use Redis are carousel, leaders, website content/settings/gallery/constitution, policies and latest news.

Verify it after deployment at:

```text
https://benovelent-midax.onrender.com/api/health
```

The JSON should report MongoDB status plus a `redis` object with `enabled: true` and `connected: true` once Redis is configured and reachable.

## 4. Cloudinary

Use the Cloudinary values only on Render. New uploaded images/PDFs are stored in Cloudinary; PDFs/documents use Cloudinary `raw` resources.

The constitution endpoint automatically migrates the existing local constitution file to Cloudinary when Cloudinary is configured and the MongoDB constitution record still points to `/documents/...`.

## 5. M-PESA STK

Keep these on Render only:

```env
MPESA_ENABLED=true
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=<Daraja consumer key>
MPESA_CONSUMER_SECRET=<Daraja consumer secret>
MPESA_PASSKEY=<Daraja passkey>
MPESA_SHORTCODE=<your Daraja merchant shortcode>
MPESA_ACCOUNT_REFERENCE=0650186528835
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
MPESA_CALLBACK_URL=https://benovelent-midax.onrender.com/api/payments/callback
MPESA_MANUAL_PAYBILL=247247
```

The manual PayBill is independent of the shortcode used for the Daraja STK application. Do not assume PayBill 247247 is the shortcode for the STK application unless Safaricom has explicitly provisioned it that way for your account.

## 6. M-PESA B2C

Leave B2C disabled until the production InitiatorName, SecurityCredential, shortcode and Safaricom-approved callbacks are available:

```env
MPESA_B2C_ENABLED=false
MPESA_B2C_SHORTCODE=<approved B2C shortcode>
MPESA_INITIATOR_NAME=<approved initiator>
MPESA_SECURITY_CREDENTIAL=<approved security credential>
MPESA_B2C_RESULT_URL=https://benovelent-midax.onrender.com/api/payments/b2c/result
MPESA_B2C_TIMEOUT_URL=https://benovelent-midax.onrender.com/api/payments/b2c/timeout
MPESA_B2C_COMMAND_ID=BusinessPayment
```

Only set `MPESA_B2C_ENABLED=true` after those values have been issued and tested by Safaricom.
