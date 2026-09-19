# Benevolent MIDAX — Portal Test Matrix — 2026-09-19

Legend: **SOURCE PASS** = implementation/route contract is verified in the authoritative ZIP. **LIVE NOT VERIFIED** = an authenticated browser interaction could not be executed from this environment.

## Member

| Page | Button/action set | Expected behavior / contract | Source result | Live result |
|---|---|---|---|---|
| Login | Sign in, validation, logout | Authenticate as Member, establish session, land on member dashboard | SOURCE PASS | LIVE NOT VERIFIED |
| Dashboard | Account/community shortcuts, notifications, chat preview | Navigate only to member-authorized tools; errors surface instead of fake empty success | SOURCE PASS | LIVE NOT VERIFIED |
| Accounts | Constitution / M-Pesa Accounts / Community M-Pesa Support tabs; Load Ledger; Print; PDF; CSV; payment/assist | Constitution first, M-Pesa second, community support third; live book balance visible; ledger uses authoritative finance service; exports use retrieved ledger | SOURCE PASS | LIVE NOT VERIFIED |
| Contributions | Year/data load | Dedicated `/member/contributions`; member-owned expected/paid/outstanding/history only | SOURCE PASS | LIVE NOT VERIFIED |
| Dependents | Add; Request Edit; Upload; Apply Approved Change | Existing dependent cannot be directly PUT/DELETE by member; edit request is reviewed then explicitly completed in approved scope | SOURCE PASS | LIVE NOT VERIFIED |
| Dependents documents | View Documents, Add Document(s), Replace, protected document links | Multiple document types; secure download endpoint; replacement supersedes old document | SOURCE PASS | LIVE NOT VERIFIED |
| Claims / Support | Create request, edit/cancel where authorized, view status, community assistance/payment | Correct support/claim route; failure surfaced; no generic repayment outside education policy | SOURCE PASS | LIVE NOT VERIFIED |
| Messages | Search/filter, open conversation, send, emoji, typing, read, delete, audio/video call controls | Authenticated member/admin communication, no self-chat, realtime events, call summary/missed call | SOURCE PASS | LIVE NOT VERIFIED |
| Notifications | Open, mark read, mark all read, clear | Stable notification identity/event ID; unread count and realtime updates without duplicate records | SOURCE PASS | LIVE NOT VERIFIED |
| M-Pesa records | Load/view payment records | Member-scoped payment records | SOURCE PASS | LIVE NOT VERIFIED |

## Admin

| Page | Button/action set | Expected behavior / contract | Source result | Live result |
|---|---|---|---|---|
| Login | Sign in, validation, logout | Authenticate as Admin and load admin portal | SOURCE PASS | LIVE NOT VERIFIED |
| Members | Search/filter, View, Edit, View Dependents, Verify/Suspend/Activate, authorized delete/reset | Each member exposes direct View Dependents; selected member opens dependent management backed by APIs | SOURCE PASS | LIVE NOT VERIFIED |
| Dependent management | View Documents, Edit, Verify, Archive/Delete, Add Document(s), Replace, document Verify/Reject, edit-request Approve/Reject | Selected member's dependents/documents are loaded from backend; destructive action confirmed/audited; edit requests review securely | SOURCE PASS | LIVE NOT VERIFIED |
| Accounts / Finance | Load, add/edit/delete finance, attachments, payment/community-support actions | All finance views use authoritative ledger logic and role-authorized mutation endpoints | SOURCE PASS | LIVE NOT VERIFIED |
| Reports | Date presets, From/To, Load report, Print, PDF, CSV | Financial/member/contribution/support/dependent/ledger/audit/minutes reporting; exports derive from report data | SOURCE PASS | LIVE NOT VERIFIED |
| Support / Broadcast | Load, recipient selection, validation, send, refresh, error handling | Broadcast response exposes delivery metrics and duplicate/in-progress safeguards | SOURCE PASS | LIVE NOT VERIFIED |
| Claims | Load, stage transition, approve/reject, publish support approval to News, community assist | Claim workflow keeps genuine claim types separate from meeting-minutes News flow | SOURCE PASS | LIVE NOT VERIFIED |
| News / Announcements | Create, draft/publish, edit/unpublish/delete, attachments | Uses News model/route; published state persists and notifies once per event identity | SOURCE PASS | LIVE NOT VERIFIED |
| Meeting Minutes | Save Draft, Preview, Publish to News | POST `/api/news` with `category=Meeting` and `sourceModel=BenevolentMeetingMinutes`; no claim-type workflow | SOURCE PASS | LIVE NOT VERIFIED |
| Messages | Conversations, send, calls/video | Admin is an authorised chat participant; WebRTC/signaling is member/admin only | SOURCE PASS | LIVE NOT VERIFIED |
| Notifications | Open/read/clear/realtime | No duplicate notification persistence; delivery errors visible | SOURCE PASS | LIVE NOT VERIFIED |

## SuperAdmin

| Page | Button/action set | Expected behavior / contract | Source result | Live result |
|---|---|---|---|---|
| Login | Sign in, validation, logout | Authenticate as SuperAdmin | SOURCE PASS | LIVE NOT VERIFIED |
| Members | Search/filter, View, Edit, View Dependents, Verify/Archive, document actions, edit-request review | Same dependent management capability as Admin via real backend APIs | SOURCE PASS | LIVE NOT VERIFIED |
| Constitution / Accounts | Live balance, ledger filters, Print/PDF/CSV | Same authoritative finance service; no competing calculations | SOURCE PASS | LIVE NOT VERIFIED |
| Policies | Create/update/delete policy configuration | Repayment is allow-listed to `education-policy`; medical/funeral remain non-repayable in current scheme configuration | SOURCE PASS | LIVE NOT VERIFIED |
| Support / Claims | Load, review, publish authorized support updates | Support/claim workflow remains separate from News minutes | SOURCE PASS | LIVE NOT VERIFIED |
| News | Create/edit/publish/unpublish/delete | News records persist through News routes; Meeting Minutes use same News system | SOURCE PASS | LIVE NOT VERIFIED |
| Data Integrity | Reconcile/cleanup duplicates, orphan chat data, print report | Governance tooling only; not a SuperAdmin chat UI | SOURCE PASS | LIVE NOT VERIFIED |
| System / Settings / Notifications | Health, configuration, notification operations, reload/test integration where available | Role-protected system controls and stable notification events | SOURCE PASS | LIVE NOT VERIFIED |
| Chat / Calls | N/A — must not exist | No SuperAdmin messaging route/menu/import/call workflow | SOURCE PASS | LIVE NOT VERIFIED |
