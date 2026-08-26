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


## v18.2.0 architecture upgrade applied
- Fixed `MEMBER_STATUS is not defined` in the member eligibility path and corrected active-status comparison.
- Member generic support requests now require at least two documents from different categories; `Other` requires a label.
- Members can edit/delete generic support requests only while status is `Under Review`.
- Financial transaction deletion is SuperAdmin-only at both route and controller layers; Admin UI no longer shows Delete.
- SuperAdmin Chat route is removed from the portal navigation and legacy `/superadmin/messages` redirects safely to the SuperAdmin dashboard.
- Member navigation is streamlined so Notifications, Announcements and Benefits remain secondary portal areas rather than main sidebar entries.
- Added a cached public `/api/leaders/current` endpoint backed by active Admin/SuperAdmin records and rendered it on Home with phone/email/profile details.
- Added broader public news caching with namespace invalidation.
- Added Redis invalidation when dependents and administrators change.
- Updated environment examples to `APP_VERSION=18.2.0` / `VITE_APP_VERSION=18.2.0`.
- Admin News & Communications entry now explicitly supports picture-based public news creation through the existing multipart news API.


## v18.3.0 missing-gap fixes

- Fixed the public current-leadership route crash caused by missing Admin/SuperAdmin model imports.
- Rebuilt member Accounts cash-flow maths with true opening balance, chronological running balance, contribution inflows, Money In/Money Out totals and privacy-safe assisted-case records.
- Added a dedicated member M-PESA records page and Accounts link.
- Added community M-PESA payout timestamps/receipts to the database record and finance views.
- Added finance update/hide/delete notifications so member account activity is connected to portal notifications.
- Added a dedicated Admin Announcements workflow with cover/gallery uploads that publishes directly to the public News API.
- SuperAdmin chat is now blocked at backend chat middleware as well as removed from the portal UI.
- Removed Notifications/Announcements secondary areas from the portal primary sidebar where applicable; they remain reachable from dashboard/secondary routes.
- Added the administrator's registered role/permission summary to the Admin Dashboard.
- Reduced the Home carousel retry behaviour so the first render does not sit in a repeated five-second retry loop; browser/network priority remains on the first hero image.

Validation: route/UI/page/chat/M-PESA/production/upgrade/callback contracts passed; all 161 backend JavaScript files pass `node --check`. A fresh dependency installation and Vite build could not be completed because the execution environment timed out during `npm ci`.
