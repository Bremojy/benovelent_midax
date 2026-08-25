# Benevolent MIDAX: Redis and M-PESA B2C deployment

## Redis
The backend supports Redis through REST-compatible `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` variables. Redis is optional: when unavailable, requests continue against MongoDB without breaking the website.

The current cache layer is used for website content and Benevolent Assistant context. Writes invalidate the relevant website cache keys. Assistant context uses a short TTL so published content and SuperAdmin-configured FAQs propagate quickly.

Set these on Render only:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
REDIS_KEY_PREFIX=benevolent-midax:v1
REDIS_TIMEOUT_MS=1200
```

Never put Redis tokens in Vite/frontend environment variables.

## M-PESA B2C
B2C disbursement is server-authorized for SuperAdmin only. The Accounts page exposes the payout control only to SuperAdmin, while the backend also enforces the role using the protected B2C routes.

Use real Safaricom/Daraja production values for:

```env
MPESA_B2C_SHORTCODE=
MPESA_INITIATOR_NAME=
MPESA_SECURITY_CREDENTIAL=
MPESA_B2C_RESULT_URL=https://benovelent-midax.onrender.com/api/payments/b2c/result
MPESA_B2C_TIMEOUT_URL=https://benovelent-midax.onrender.com/api/payments/b2c/timeout
MPESA_B2C_COMMAND_ID=BusinessPayment
```

The security credential is not the STK Push passkey. Keep all M-PESA secrets on the Render backend only.

## Production security
Rotate any credentials that were previously pasted into chat or another exposed location before redeploying. The updated project contains placeholders only; it does not package live credentials.
