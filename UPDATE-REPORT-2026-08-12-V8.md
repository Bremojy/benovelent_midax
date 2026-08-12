# Benovelent MIDAX V8 — Contribution Model, Accounts & Portal Reliability

## Contribution model
- The scheme now treats member contributions as a single shared payroll/payslip deduction rather than a voluntary member-entered amount.
- Admin/SuperAdmin Accounts includes a **Payroll Contribution Run** that creates or updates the same monthly deduction for every active member.
- Re-running the same month updates existing Contribution records and linked Finance entries instead of creating duplicate contribution records.
- Finance and Contribution payment-method enums now support `Payroll`.
- Member-facing contribution APIs no longer expose an individual member's contribution records through the member dashboard/account view.

## Member Accounts
- `/member/accounts` is now scheme-wide and intentionally identical in scope for every member.
- Shows standard monthly deduction, active members, scheme collected/outstanding, support summary, monthly payroll pulse and anonymized scheme ledger activity.
- Personal contribution totals, member names, employee numbers and personal finance records are excluded.
- Print/Download produces the same general scheme statement.

## Dashboards
- Member dashboard shows the shared standard payroll deduction and scheme pulse rather than personal contribution totals.
- Admin dashboard highlights scheme contributions collected, current-month collection, standard deduction and members charged.
- SuperAdmin dashboard includes live contribution collection and members-charged signals.

## Admin Accounts edit
- Finance Edit now supports every Finance transaction type and Payroll payment method.
- Editing a linked contribution transaction synchronizes its amount/date/payment metadata back to the linked Contribution record.
- Linked contribution transactions cannot accidentally be changed into a different transaction type.

## Existing V7 work retained
- PWA and Benovelent MIDAX branding
- Modern portal redesign
- CORS and authentication fixes
- Data Integrity / backup / cleanup tooling
- Carousel duplicate cleanup
- Cloudinary upload persistence
- Feedback improvements
- Accounts and portal quick links
- Monthly-income removal

## Verification
- Backend JavaScript: `node --check` passed for all backend JS files.
- Frontend JS/JSX: TypeScript transpile/syntax parsing passed for all `src` JS/JSX files.
- Full Vite production bundling was not run because the environment has no installed project dependencies and its npm registry configuration is invalid (`https:///`).
