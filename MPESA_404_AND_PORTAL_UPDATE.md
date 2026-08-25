# Benevolent MIDAX — M-PESA and Portal Update

## STK Push
Canonical route: `POST /api/payments/stk`. Compatibility aliases are also provided for older clients. The Vercel frontend uses same-origin `/api` routing and falls back to the Render backend only when the proxy returns HTTP 404.

The backend now gives a specific diagnostic when Safaricom itself returns HTTP 404. STK submission is treated as accepted only when Safaricom returns response code `0`; final payment settlement is callback-driven.

## Production requirements
Keep all Daraja secrets on Render/backend only. Verify `MPESA_ENABLED=true`, real production consumer key/secret/passkey/shortcode, and an HTTPS public `MPESA_CALLBACK_URL`.

## B2C
B2C remains SuperAdmin-only at the API layer. The B2C initiator name and security credential must be real before live payouts can execute.

## Portal UX
Desktop sidebars, mobile bottom navigation and topbars were polished without adding unnecessary business content. Sensitive forms received modern touch targets, focus states, mobile-safe sizing and consistent controls.

## Deployment
Redeploy both Vercel and Render after extracting this ZIP. A live 404 cannot be corrected on the local machine while the deployed frontend/backend are still running an older route set.
