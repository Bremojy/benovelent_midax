# Benevolent MIDAX audit patch notes

This patch is based on the uploaded Benevolent MIDAX source archive and is intended as a conservative remediation set, not a deployment.

## Changes applied

1. Public Services policy summaries now show repayment terms only when `repaymentEnabled` is true. Medical and funeral policies therefore do not inherit a repayment-months label accidentally.
2. The member dashboard Accounts shortcut no longer describes the member account as a generic loan account.
3. The member support form only exposes the Education Policy when an enabled education policy exists and removes the free-form `Other Support` selection from the new-application UI.
4. Generic support-request creation now requires an enabled policy, reducing the chance of creating unsupported free-form support records.
5. Generic SupportRequest repayment is guarded server-side so it is not enabled for ordinary support policies. The current configured Education Policy is the only repayable policy recognized by this patch.
6. M-PESA generic support-repayment endpoints reject records unless they are tied to the Education Policy.
7. Policy creation/update does not enable repayment for ordinary support policies.
8. Leader, dashboard-profile, and News asset resolution uses `resolveUploadUrl()` rather than treating Render-hosted `/uploads/...` files as Vercel-hosted static files. This addresses a real source-level cause of missing uploaded images/attachments.
9. SupportRequest persistence has an additional schema-level repayment guard.

## Important governance note

The uploaded `public/documents/benevolent-midax-constitution.pdf` and the other November 2025 constitution PDF in the archive describe funeral and medical support and do not contain an education-loan section. The repository also contains migration/controller/UI logic for an Education Policy. This patch therefore does not invent a constitutional clause or claim that education is in the supplied constitution; the audit report marks this as a source-of-truth discrepancy that must be resolved by the scheme's authorised governance records.

## Not changed automatically

The patch does not delete historical community-assistance or M-PESA data, does not alter the constitution file, and does not deploy to Vercel/Render. Production deployment and database-state migration must be run against the actual environment after the governance source of truth is confirmed.
