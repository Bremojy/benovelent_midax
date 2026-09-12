# Benevolent MIDAX — Verified Audit & Fixes (2026-09-12)

## Scope
This pass reviewed the uploaded source tree, deployment configuration, backend/frontend route contracts, security/quality contracts, and the affected policy, feedback, support, and M-Pesa flows. Only confirmed code-level defects were changed.

## Confirmed defects fixed

1. **Home policy cards could never find Funeral/Medical policies.** The Home page compared the policy `category` to `funeral-support` / `medical-support`, while seeded records use `category: support` and those values as `slug`. The cards also used a non-existent `title` field. Fixed to resolve by slug and use `name`.

2. **Assistant policy context queried fields not present in the Policy model.** It requested `title`, `summary`, `communityAssistance`, and `displayOrder`; the model defines `name`, `communityAssistanceEnabled`, and `order`. Fixed both assistant-context queries and sorting.

3. **Renaming a policy could silently change its slug.** Existing support/claim records use slugs as stable identifiers. SuperAdmin policy updates now preserve the current slug unless an explicit slug is supplied, and slug conflicts return HTTP 409.

4. **Member support edits could bypass policy amount limits.** Create-time validation existed, but Under Review edits did not revalidate the selected policy or amount. Fixed with server-side policy/amount checks and authoritative policy metadata refresh.

5. **Repayment totals could become stale after support-request edits.** The SupportRequest save hook did not recalculate when `requestedAmount` or `repaymentMonths` changed. Fixed.

6. **Feedback login frequency was only partly enforced by the browser.** The server ignored `promptFrequencyDays`, making the setting ineffective across browsers/devices. Fixed by enforcing the interval from the latest response on the backend; the existing frontend guard remains as a UX optimization.

7. **Education Policy was explicitly disabled by migration 005 despite being part of the seeded policy set and the requested portal workflow.** Added migration 010 to make the Education Policy enabled and administratively configurable. SuperAdmin can still disable/edit/delete policies through Policy Administration.

8. **Approval audit references used the wrong model for Education Support and could not represent SuperAdmin approvals consistently.** Education Support pointed `approvedBy` at `Member`, while the application is approved by Admin/SuperAdmin. Medical/Funeral were Admin-only refs even though SuperAdmin can also act. Fixed all three claim models to use a polymorphic `approvedByModel` reference and record the approving role.

## Verified areas
The following existing targeted source-contract tests passed before these fixes: security, quality, source integrity, route contracts, portal UI contracts, page/navigation contracts, chat, calling, presence, verification, shell/regression, community M-Pesa, and M-Pesa portal role contracts.

A focused `auditRegressionTest.js` was added for the fixes above.

## Deployment limitation
The public Vercel deployment was reachable, but this environment does not expose an interactive browser-control/login tool. The audit therefore does **not** claim a successful credentialed login or pretend that live member/admin pages were clicked through. Public deployment reachability was verified; source and contract behavior were tested locally.

## Build limitation
A clean dependency installation was attempted, but the execution environment timed out during npm package retrieval, so a fresh Vite production build could not be honestly certified in this run. The backend JavaScript syntax check passed, and the targeted contract tests passed.

## M-Pesa development defaults
Existing development configuration retains the requested manual-payment destination defaults in `.env.example` / migration: Paybill `247247`, account `0650186528835`. Production secrets remain environment-controlled; they were not hard-coded into application source.
