# Benevolent MIDAX – M-PESA / Callback Diagnostic Update

## Included fixes

1. Added a dedicated `POST /api/payments/stk-query` endpoint that uses Safaricom STK Push Query with the transaction `CheckoutRequestID`.
2. Added a shared successful-payment reconciliation path so callback settlement and STK Query settlement cannot double-apply the same transaction.
3. Added `GET /api/payments/callback` diagnostics. The endpoint now explicitly returns `405 CALLBACK_POST_ONLY` instead of falling through to the generic `ROUTE_NOT_FOUND` handler. Safaricom remains expected to call the callback with `POST`.
4. Added the STK Query endpoint to the payment route-status payload.
5. Improved M-PESA diagnostics for OAuth, STK, STK Query, 404/401/403, timeout, and upstream error-code cases without exposing secrets.
6. Added STK Query fallback polling to the reusable M-PESA payment component and the Member Claims community-assistance contribution flow.
7. Changed the UI wording from claiming that a prompt was definitely displayed to the more accurate state that Safaricom accepted the STK request and the phone should be checked.
8. Added stable `id`, `name`, `htmlFor`, and `autocomplete` attributes to the reusable M-PESA amount and phone fields, resolving the browser autofill warning for those fields.
9. Updated the M-PESA contract test and added a dedicated callback/query contract test.

## Important behavior

- Opening `https://benovelent-midax.onrender.com/api/payments/callback` in a browser sends `GET`. That is not Safaricom's callback method. The updated backend responds with a clear 405 diagnostic instead of a generic route-not-found response.
- The real Safaricom callback remains `POST /api/payments/callback`.
- STK Query is used as a fallback while a transaction remains pending; it does not replace Safaricom's callback.
- No production `.env` files were modified or included.

## Validation

Passed:

- `npm test` – all configured project contract/regression suites passed.
- `node --check` on all changed backend JavaScript files.
- M-PESA STK contract test.
- M-PESA callback/query contract test.
- Static integrity, route, source-quality, UI, community M-PESA, and production-configuration contract tests.

Not run:

- Vite production build, because this source archive intentionally does not contain installed `node_modules` and dependency installation is environment-dependent.
