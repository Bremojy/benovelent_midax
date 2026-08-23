# Benevolent MIDAX — Claims, Support, Policies & M-PESA Fixes

## Implemented
- Reworked member Support submission handling for medical, funeral, education and policy-driven generic support requests.
- Added a unified professional claim-review workflow shared by Admin and SuperAdmin:
  - Pending
  - Under Review
  - Documents Required
  - Eligibility Review
  - Approval Review
  - Approved
  - Disbursement Pending
  - Paid
  - Completed
  - Rejected
  - Cancelled / Closed where applicable
- Added persisted claim timelines for member-visible review history.
- Added a unified `/api/claims` admin/superadmin API for listing claims and advancing review stages.
- Improved member Claims page so status, stage explanation, review history and rejection notes are visible.
- Improved Admin/SuperAdmin Claims page with controlled stage transitions and professional review notes.
- Added policy-backed repayment metadata for generic support requests.
- Accounts now exposes M-PESA repayment only for Education Policy and other explicitly repayable policies; medical and funeral support are not presented as repayment balances.
- Added generic support repayment handling to the M-PESA STK/callback flow.
- M-PESA collection defaults are PayBill `247247` and account reference `0650186528835`, with environment variables still able to override them.
- SuperAdmin Policies reads now self-repair missing default live policies, so the live policy list cannot remain empty solely because the seed migration was previously marked complete.
- Member profiles now default to employer `MIDAX` and position `Employee`; members cannot edit either value through the member profile endpoint or UI.
- Added a migration to normalize existing members that have blank employer/position values.
- Removed the duplicate Constitution PDF copy while retaining the canonical filename used by the application.

## Verification performed
- Route contract test: PASSED (279 backend route contracts, 136 frontend API calls checked).
- Static integrity test: PASSED.
- Member database contract test: PASSED.
- Portal UI contract test: PASSED.
- Portal shell test: PASSED.
- Regression audit: PASSED.
- Source quality test: PASSED.
- Node syntax checks passed for changed backend files.

## Live M-PESA note
The ZIP contains the corrected Daraja/STK/callback logic, but a real payment cannot be executed from a static ZIP without the deployed backend environment, valid Safaricom Daraja credentials, callback URLs and an authenticated member session. The code now fails clearly when those live prerequisites are missing instead of silently appearing to work.
