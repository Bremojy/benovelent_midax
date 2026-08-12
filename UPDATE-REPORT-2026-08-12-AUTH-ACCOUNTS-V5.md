# Benevolent Midax — Update V5: Auth, Accounts & Portal Stability

## Fixed
- Added the missing SuperAdmin dashboard `money()` formatter, eliminating `ReferenceError: money is not defined`.
- Kept SuperAdmin integrity member endpoints protected by Bearer authentication.
- Added a protected GET member-preview endpoint for integrity tooling.
- Hardened frontend token selection to prefer the token matching the authenticated role.

## Accounts
- Member Accounts uses the signed-in member ID only.
- Member finance ledger and transactions are limited to the selected year and approved/completed transactions.
- Member support history shows requested and approved/helped amounts for that member.
- Monthly contribution counts are personal rather than scheme-wide.
- Added refresh and print/download controls.
- Admin and SuperAdmin Accounts continue to use live `/finance` summary, transaction, contribution and ledger endpoints with backend role authorization.

## Privacy
- No `monthlyIncome` references remain in member/admin/superadmin page code.
- Protected APIs are not made public merely to make direct browser URL access work.

## Verification
- All backend JavaScript files pass `node --check`.
- No `monthlyIncome` references remain under `src/pages/member`, `src/pages/admin`, or `src/pages/superadmin`.
- Production Vite build could not be completed in this environment because npm is configured with an invalid registry (`https:///`).
