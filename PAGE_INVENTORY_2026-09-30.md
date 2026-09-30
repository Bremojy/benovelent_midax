# Benevolent MIDAX — Page/Route Inventory

**Date:** 2026-09-30
**Source:** uploaded `benovelent_midax-main (5).zip`

> This is the source-level page inventory. Route and authorization contracts are verified by the repository suite. Interactive authenticated live UI is `NOT VERIFIED — unavailable in current environment`.

| Route | Role | Component | API/source evidence | Route contract | Live UI |
|---|---|---|---|---|---|
| `/` | public | `Home` | GET /leaders/current; GET /policies/public | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/about` | public | `About` | GET /website | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/services` | public | `Services` | GET /policies/public | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/leaders` | public | `Leaders` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/constitution` | public | `Constitution` | GET /website/constitution | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/gallery` | public | `Gallery` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/news` | public | `News` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/resources` | public | `Navigate` | Route/source only | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/events` | public | `Navigate` | Route/source only | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/contact` | public | `Contact` | POST /contact | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/privacy-policy` | public | `PrivacyPolicy` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/terms-conditions` | public | `TermsConditions` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/disclaimer` | public | `Disclaimer` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/members` | public | `Navigate` | Route/source only | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/login` | public | `Login` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/verify-membership` | public | `VerifyMembership` | GET /platform/membership/verify | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/account` | member | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/money` | member | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/support-center` | member | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/community` | member | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/help` | member | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/operations` | admin, superadmin | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/finance-center` | admin | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/communications` | admin | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/leadership` | admin | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/people` | superadmin | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/governance` | superadmin | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/finance-center` | superadmin | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/communications` | superadmin | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/system-center` | superadmin | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/settings-center` | superadmin | `PortalSectionPage` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin` | admin | `AdminDashboard` | API calls via helper/service | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/members` | admin, superadmin | `AdminMembers` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/platform` | admin, superadmin | `Navigate` | Route/source only | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/accounts` | admin | `AdminAccounts` | GET /payments/transactions; GET /payments/community-assistance/admin; GET /admin/members; GET /admin/colleagues; GET /finance/book-balance; GET /finance/constitution-ledger; PUT /finance/{editing._id}; POST /finance | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/finance` | protected | `Navigate` | Route/source only | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/claims` | admin, superadmin | `AdminClaims` | GET /claims; GET /payments/community-assistance/admin; PUT /claims/{selected.sourceType}/{selected._id}/stage; POST /payments/community-assistance; POST /claims/community/{appealReview._id}/review; POST /claims/{c.sourceType}/{c._id}/publish-news; POST /claims/community/{c._id}/publish-news; POST /payments/community-assistance/{campaign._id}/payout | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/support` | admin, superadmin | `AdminSupport` | GET /contact; GET /member/support-requests; DELETE /contact/{id}; DELETE /member/support-requests/{id} | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/messages` | admin | `AdminMessages` | GET /member/chat-members; GET /conversations | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/notifications` | admin | `AdminNotifications` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/announcements` | admin | `AdminAnnouncements` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/settings` | admin | `PortalSettings` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/website` | admin | `AdminWebsite` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/reports` | admin | `AdminReports` | GET /admin/reports; GET /admin/reports/export.{kind}; POST /news | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/reports` | superadmin | `AdminReports` | GET /admin/reports; GET /admin/reports/export.{kind}; POST /news | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/polls` | admin | `Polls` | GET /polls; GET /polls/{pollId}/results; POST /polls; POST /votes/{pollId}; DELETE /polls/{pollId} | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/admin/feedback` | admin | `Feedback` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member` | member | `MemberDashboard` | GET /member/community-stats; GET /member/contributions?year={new Date().getFullYear()} | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/profile` | member | `Profile` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/platform` | member | `Navigate` | Route/source only | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/accounts` | member | `MemberAccounts` | GET /member/summary; GET /payments/mine; GET /payments/community-assistance; GET /payments/community-assistance/mine/ledger; GET /finance/book-balance; GET /finance/constitution-ledger | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/contributions` | member | `Contributions` | GET /member/contributions | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/claims` | member | `Claims` | GET /member/claims; GET /payments/community-assistance; GET /payments/config; POST /claims/community/request | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/announcements` | member | `Announcements` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/messages` | member | `Messages` | GET /member/chat-members; GET /conversations | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/notifications` | member | `Notifications` | GET /notifications; PUT /notifications/{id}/read; PUT /notifications/read-all; DELETE /notifications/clear | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/settings` | member | `PortalSettings` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/support` | member | `Support` | GET /dependents/my; GET /policies/public; PUT /member/support-requests/mine/{editingRequest._id}; DELETE /member/support-requests/mine/{claim._id} | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/benefits` | member | `Benefits` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/dependents` | member | `Dependents` | GET /dependents/my; GET /dependents/edit-requests/mine; POST /dependents; POST /dependents/edit-requests; POST /dependents/{dependentId}/documents; POST /dependents/edit-requests/{requestId}/complete | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/guide` | member | `PortalGuide` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/polls` | member | `Polls` | GET /polls; GET /polls/{pollId}/results; POST /polls; POST /votes/{pollId}; DELETE /polls/{pollId} | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/mpesa-records` | member | `MpesaRecords` | GET /payments/mine | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/member/feedback` | member | `Feedback` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin` | superadmin | `SuperAdminDashboard` | GET /superadmin/system/status | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/admins` | superadmin | `SuperAdminAdmins` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/platform` | superadmin | `Navigate` | Route/source only | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/members` | superadmin | `AdminMembers` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/accounts` | superadmin | `SuperAdminAccounts` | GET /payments/transactions; GET /payments/community-assistance/admin; GET /admin/members; GET /admin/colleagues; GET /finance/book-balance; GET /finance/constitution-ledger; PUT /finance/{editing._id}; POST /finance | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/finance` | protected | `Navigate` | Route/source only | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/audit` | superadmin | `SuperAdminAudit` | GET /audit-logs/summary; GET /audit-logs; GET /audit-logs/coverage; DELETE /audit-logs/{id} | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/notifications` | superadmin | `SuperAdminNotifications` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/news` | superadmin | `SuperAdminNews` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/claims` | superadmin | `AdminClaims` | GET /claims; GET /payments/community-assistance/admin; PUT /claims/{selected.sourceType}/{selected._id}/stage; POST /payments/community-assistance; POST /claims/community/{appealReview._id}/review; POST /claims/{c.sourceType}/{c._id}/publish-news; POST /claims/community/{c._id}/publish-news; POST /payments/community-assistance/{campaign._id}/payout | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/support` | superadmin | `AdminSupport` | GET /contact; GET /member/support-requests; DELETE /contact/{id}; DELETE /member/support-requests/{id} | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/settings` | superadmin | `SuperAdminSettings` | GET /website; GET /carousel; GET /leaders; GET /website/gallery; GET /website/settings; GET /superadmin/settings; PUT /website/{key}; POST /website | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/leaders` | superadmin | `SuperAdminSettings` | GET /website; GET /carousel; GET /leaders; GET /website/gallery; GET /website/settings; GET /superadmin/settings; PUT /website/{key}; POST /website | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/policies` | superadmin | `SuperAdminPolicies` | GET /policies/admin; PUT /policies/{editing}; POST /policies; DELETE /policies/{id} | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/password` | superadmin | `PortalSettings` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/data-integrity` | superadmin | `SuperAdminDataIntegrity` | GET /superadmin/data-integrity; GET /superadmin/data-integrity/members-reconciliation; GET /superadmin/data-integrity/backup/human; GET /superadmin/data-integrity/backup/human/print; GET /superadmin/data-integrity/backup; GET /superadmin/data-integrity/print-database; DELETE /superadmin/data-integrity/members/{memberId}; POST /superadmin/data-integrity/cleanup/carousels/deep | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/system` | superadmin | `SuperAdminSystem` | GET /health | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/constitution` | superadmin | `SuperAdminConstitution` | GET /website/constitution; POST /website/constitution/upload | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/polls` | superadmin | `Polls` | GET /polls; GET /polls/{pollId}/results; POST /polls; POST /votes/{pollId}; DELETE /polls/{pollId} | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `/superadmin/feedback` | superadmin | `Feedback` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |
| `*` | protected | `NotFound` | No direct API call | PASS — verified | NOT VERIFIED — unavailable in current environment |

**Unique routes inventoried:** 85.
**Portal menu/section paths:** 66 unique linked paths verified by `npm run test:menu-routes`.


## Global cross-portal addition — Command Center

| Surface | Role | Purpose | API dependencies | Authorization | Mobile/Desktop | Test result |
|---|---|---|---|---|---|---|
| Ctrl+K / topbar Search | Member / Admin / SuperAdmin | Search records authorized to the current role | `GET /api/platform/search` | Backend `protect` plus role-scoped query filters | Shared responsive modal; desktop shortcut plus mobile-safe dialog | `PASS — verified` source/contract |
| Attention control | Member / Admin / SuperAdmin | Show current unread notifications and pending support attention | `GET /api/platform/activity` | Backend actor-scoped notifications/audits; SuperAdmin governance audit visibility | Shared responsive modal | `PASS — verified` source/contract |
