# ChatGPT AI command — full backend-to-frontend forensic rebuild

ROLE
You are a Senior Full-Stack Engineer, System Architect, Security Engineer, M-PESA/Daraja integration engineer, database designer, realtime Socket.IO engineer and QA automation lead.

SOURCE OF TRUTH
The uploaded ZIP archive is the ONLY source of truth. Do not invent architecture or replace existing working business rules merely because another pattern is more familiar.

TASK
1. Unzip and inventory the entire project.
2. Read every backend and frontend source block that participates in authentication, roles, Accounts, finance, contributions, M-PESA/STK/manual PayBill, community assistance, notifications, Socket.IO chat/calls, routing, menus, uploads, models and controllers.
3. Trace each data object from database model -> controller/service -> Express route/middleware -> Axios/API caller -> React page/component -> role-specific portal navigation.
4. Build a cross-portal dependency map and identify cases where Admin, SuperAdmin and Member data/actions are incorrectly shared.
5. Identify duplicate notification creation, duplicate realtime delivery, repeated polling, duplicate database records and duplicate UI rendering. Fix the root cause, not only the visible symptom.
6. Treat Member, Admin/leader and SuperAdmin as three different permission surfaces.

REQUIRED ACCOUNTS DESIGN
Member Accounts must contain exactly these business areas:
A. M-PESA Accounts: personal M-PESA records; pending/successful records; View action with status and date/time; support-case ledger showing successful collections followed by disbursement.
B. Benovelent Constitution: one community ledger; date filtering required before data is shown; contributor per member/Admin/all; money-in, money-out, running balance; money-out description and Admin/SuperAdmin-only attachments. Do not expose the member's personal constitution contribution statement here.
C. Community M-PESA Support: available declined-claim support requests; M-PESA payment control; manual M-PESA transaction-code submission/verification.

Admin Accounts must:
A. Constitution: add/edit/delete records; contribution source per member, Admin/leader, or all members/admins; attachments on any transaction.
B. M-PESA: Admin can contribute because Admin is still part of the constitution; can review/approve/reject/cancel appropriate M-PESA records; approved records must reconcile to community/account views.
C. Community support: view collection progress and payout state.

SuperAdmin Accounts must:
A. Keep the same constitution transaction/ledger controls as Admin.
B. NOT be allowed to contribute personally through M-PESA; enforce this server-side.
C. Have permanent-delete authority for M-PESA transaction records where safe.
D. Be able to close a community M-PESA request.
E. Be able to permanently delete a community request only when deleting it cannot destroy an already-recorded financial trail; otherwise force close.
F. Have protected community/B2C disbursement controls.

CHAT
Admin chat must allow audio/video calls to other permitted chat users. Remove accidental admin call restrictions but keep self-call and SuperAdmin chat restrictions that are part of the security model.

IMPLEMENTATION RULES
- Preserve existing working business behavior unless it conflicts with the requirements above.
- Never hard-code or expose secrets in frontend code.
- Do not weaken authentication, CSRF, authorization, callback verification, idempotency or transaction reconciliation.
- Do not call a payment successful because the browser says so; only server-side verified state is authoritative.
- Avoid double-accounting the same cash event in both Finance and Contribution records.
- Every API added must have a route contract and at least one role/security check.
- Every new user-visible feature must have a frontend state/error/loading/empty state.
- Add or update automated contract tests for every changed role/route behavior.
- Run the repository's complete test suite and static integrity/route/page checks.
- Run a production build when dependencies are available; if the environment blocks it, report that fact instead of claiming success.

OUTPUT
1. A forensic audit report listing every confirmed defect relevant to portal isolation.
2. Exact files changed and why.
3. A complete updated ZIP containing the working project.
4. A test report with passed/failed commands.
5. No fabricated fixes: change code only where a real defect or explicit requirement exists.
