# Benevolent MIDAX audit patch notes

This document records the cumulative audited patch state represented by the uploaded Benevolent MIDAX archive plus the 2026-09-30 audit delta. The current release is a conservative enhancement, not a deployment.

## Baseline repairs re-audited and retained

1. Public Services policy summaries now show repayment terms only when `repaymentEnabled` is true. Medical and funeral policies therefore do not inherit a repayment-months label accidentally.
2. The member dashboard Accounts shortcut no longer describes the member account as a generic loan account.
3. The member support form only exposes the Education Policy when an enabled education policy exists and removes the free-form `Other Support` selection from the new-application UI.
4. Generic support-request creation now requires an enabled policy, reducing the chance of creating unsupported free-form support records.
5. Generic SupportRequest repayment is guarded server-side so it is not enabled for ordinary support policies. The current configured Education Policy is the only repayable policy recognized by this patch.
6. M-PESA generic support-repayment endpoints reject records unless they are tied to the Education Policy.
7. Policy creation/update does not enable repayment for ordinary support policies.
8. Leader, dashboard-profile, and News asset resolution uses `resolveUploadUrl()` rather than treating Render-hosted `/uploads/...` files as Vercel-hosted static files. This addresses a real source-level cause of missing uploaded images/attachments.
9. SupportRequest persistence has an additional schema-level repayment guard.

## Current 2026-09-30 audit changes

## Important governance note

The uploaded `public/documents/benevolent-midax-constitution.pdf` and the other November 2025 constitution PDF in the archive describe funeral and medical support and do not contain an education-loan section. The repository also contains migration/controller/UI logic for an Education Policy. This patch therefore does not invent a constitutional clause or claim that education is in the supplied constitution; the audit report marks this as a source-of-truth discrepancy that must be resolved by the scheme's authorised governance records.

## Not changed automatically

The patch does not delete historical community-assistance or M-PESA data, does not alter the constitution file, and does not deploy to Vercel/Render. Production deployment and database-state migration must be run against the actual environment after the governance source of truth is confirmed.


10. Added a shared portal Command Center opened from Ctrl+K, the topbar search field, or the compact Attention control. It uses the authenticated `/api/platform/search` and `/api/platform/activity` endpoints rather than client-side fake data.
11. Hardened platform search so it never scans the private document root for general authenticated users; only bundled public documents are searchable through this endpoint.
12. Restricted the activity center so non-SuperAdmin users only receive their own audit activity, while SuperAdmin remains the governance-wide audit role; SuperAdmin activity responses also omit chat conversations.
13. Added `backend/scripts/platformSearchActivityRegressionTest.js` to lock the search/privacy contracts into the standard repository test suite.
14. Removed unused API-client search/retry scaffolding (`isVercelHost`, `pendingGets`).

15. Extended Member global search to the actual typed claim collections (`MedicalSupport`, `FuneralSupport`, and `EducationSupport`) with authenticated-member ownership filters, so claim search does not omit those persisted workflows.
