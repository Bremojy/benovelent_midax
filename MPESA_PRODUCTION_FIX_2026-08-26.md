# Benevolent MIDAX — M-PESA Production Fix

## Root cause identified from the supplied Daraja screenshots and deployment configuration

The application is configured with `MPESA_ENVIRONMENT=production` and shortcode `650014`, but the previously supplied backend consumer key/secret match the **Sandbox** Daraja app shown in the screenshot (the Sandbox app begins with `aFNZ...` / `L39i...`). The Production app shown in the screenshot has a different consumer key/secret (beginning `CrTe...` / `OQGf...`).

Therefore the Render environment must use the **Consumer Key, Consumer Secret and Lipa na M-PESA Passkey from the Production Daraja app for shortcode 650014**. Never copy Sandbox app credentials into the production Render service.

The callback URL must also be registered for the production app:

`https://benovelent-midax.onrender.com/api/payments/callback`

## Public payment details

If `650014` is the scheme's actual customer-facing M-PESA PayBill/shortcode and settlement is to the scheme's Equity account, customers should still use the M-PESA shortcode and a payment/account reference. The Equity bank account number itself should not be used as the STK `BusinessShortCode` or as the phone number.

The application now defaults its public/manual collection display to shortcode `650014` and reference `BENMIDAX` when no backend-configured public reference is provided. The STK request stores and sends a sanitized reference of at most 13 characters.

## Chat/PWA corrections included

- Stale conversation IDs now fall back to resolving/creating the current conversation.
- Chat start/refresh/self-chat/call errors use modern toast feedback for transient actions.
- The service worker now defines `VIDEO_CACHE` and uses a bumped shell cache version so the corrected worker can replace the previous broken one.
- The customized call ringtone remains bundled at `/sounds/benovelent-call.mp3`.

## Verification

The repository regression suite passes all 15 stages after these changes. No production secrets are included in this package.
