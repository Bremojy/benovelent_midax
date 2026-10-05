const fs = require("fs");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const check = (condition, message) => { if (!condition) throw new Error(`FAIL: ${message}`); console.log(`PASS: ${message}`); };

const app = read("src/App.jsx");
const sections = read("src/config/portalSections.js");
const support = read("src/pages/member/Support.jsx");
const requests = read("src/pages/member/SupportRequests.jsx");
const adminSupport = read("src/pages/admin/AdminSupport.jsx");
const adminClaims = read("src/pages/admin/AdminClaims.jsx");
const memberClaims = read("src/pages/member/Claims.jsx");
const superClaims = read("src/pages/admin/AdminClaims.jsx");
const financeController = read("backend/controllers/financeController.js");
const financeTable = read("src/components/accounts/ConstitutionLedgerTable.jsx");
const ledgerControls = read("src/components/accounts/LedgerControls.jsx");
const permissionController = read("backend/controllers/supportPermissionController.js");
const permissionModel = read("backend/models/SupportRequestPermissionRequest.js");
const supportRoutes = read("backend/routes/supportRequestRoutes.js");
const claimController = read("backend/controllers/claimWorkflowController.js");
const claimRoutes = read("backend/routes/claimWorkflowRoutes.js");
const platform = read("backend/controllers/platformController.js");
const commandCenter = read("src/components/dashboard/PortalCommandCenter.jsx");
const topbar = read("src/components/dashboard/DashboardTopbar.jsx");
const contribution = read("src/components/contributions/ContributionWorkspace.jsx");
const memberContributionRoute = read("backend/routes/memberRoutes.js");
const memberDashboard = read("src/pages/member/MemberDashboard.jsx");
const adminDashboard = read("src/pages/admin/AdminDashboard.jsx");
const superDashboard = read("src/pages/superadmin/SuperAdminDashboard.jsx");
const migrationRunner = read("backend/utils/runMigrations.js");
const migration = read("backend/migrations/012_backfill_finance_actor_provenance.js");
const portalCss = read("src/styles/portalModule.css");

check(!sections.includes('/member/documents'), "Member navigation no longer exposes a duplicate Documents page");
check(support.includes('id front') || read("src/pages/member/Profile.jsx").toLowerCase().includes("id front"), "Member Profile retains document management ownership");
check(!support.includes("My Requests") && !support.includes("editingRequest") && !support.includes("removeRequest"), "Request Support page no longer contains a duplicate My Requests/editor workflow");
check(sections.includes('/member/support/requests'), "Member navigation uses the canonical My Requests route");
check(app.includes('/member/support/requests'), "Canonical My Requests route is declared");
check(requests.includes('/member/support-requests/permissions') && requests.includes('permissionRequestId'), "Member My Requests uses the permission workflow and exact permission identity");
check(permissionModel.includes('requestedAction') && permissionModel.includes('reviewedByModel') && permissionModel.includes('Consumed'), "Dedicated support permission model stores requested action, reviewer identity, and one-time consumption state");
check(supportRoutes.includes('permissionController.create') && supportRoutes.includes('permissionController.review') && supportRoutes.includes('controller.memberUpdate') && supportRoutes.includes('controller.memberRemove'), "Support permission endpoints and protected member mutation routes are authenticated");
check(permissionController.includes('SUPPORT_PERMISSION_INVALID_OR_CONSUMED') && permissionController.includes('findOneAndUpdate') && permissionController.includes('Promise.allSettled'), "Approved support permissions are atomically consumed and secondary notification failures cannot fake a mutation failure");
check(adminSupport.includes('permissionRequestId') && adminSupport.includes('requestId') && adminSupport.includes('Review support request') && adminSupport.includes('Save review') && adminSupport.includes('position: fixed') || (adminSupport.includes('permissionRequestId') && adminSupport.includes('requestId') && adminSupport.includes('Review support request') && adminSupport.includes('Save review') && portalCss.includes('claim-review-dialog')), "Admin/SuperAdmin Support contains permission and support deep-link review workflows");

check(!financeTable.includes('approvedBy') && !ledgerControls.includes('approvedBy'), "Constitution ledger never falls back to approvedBy for Transacted by");
check(financeTable.includes('Historical actor unavailable'), "Missing historical finance actor provenance is shown truthfully");
check(financeController.includes('transactedBy: financeActor.id') && financeController.includes('transactedByModel: financeActor.model') && financeController.includes('transactedByName: financeActor.name'), "Finance creation persists the authenticated transaction actor independently");
check(financeController.includes('assertFinanceMutationAuthorization(transaction, req)'), "Finance mutation ownership is enforced server-side");
check(financeController.includes('FINANCE_TRANSACTION_OWNERSHIP_FORBIDDEN'), "Unauthorized Admin finance ownership mutation returns a clear forbidden code");
check(migrationRunner.includes('012_backfill_finance_actor_provenance') && migration.includes('transactedBy') && !migration.includes('approvedBy'), "Actor migration uses only existing transactedBy provenance and never guesses from approvedBy");

check(financeController.includes('normalizeFinanceRole(transaction?.transactedByModel) === "admin"') && financeController.includes('String(transaction?.transactedBy || "") === String(actorId || "")'), "Finance ownership comparison uses the authenticated Admin against the transaction actor model/id");
check(financeController.includes('if (role === "superadmin") return null;'), "SuperAdmin bypass remains explicit for Finance governance mutations");

check(claimController.includes('exports.permanentDelete') && claimController.includes('CLAIM_PERMANENT_DELETE_CLOSED_ONLY') && claimController.includes('await result.claim.deleteOne()'), "Permanent claim deletion physically deletes the Closed claim source record");
check(claimRoutes.includes('/:type/:id/permanent'), "Permanent Closed-claim delete has a dedicated endpoint");
check(/isSuperAdmin && c.status === "Closed"/.test(adminClaims), "Only SuperAdmin Closed claims expose permanent deletion in the UI");
check(claimController.includes('Notification.deleteMany') && claimController.includes('SupportRequestPermissionRequest.updateMany') && claimController.includes('Promise.allSettled'), "Permanent claim deletion cleans stale derived references without letting secondary cleanup failures fake deletion failure");
check(claimController.includes('sourceRemoved: true'), "Settled CommunityAssistance retains accounting evidence while de-linking the deleted claim source");

check(platform.includes('const portalPrefix = role === "superadmin" ? "/superadmin" : "/admin"'), "Search & Attention deep links are role-aware");
check(platform.includes('attentionCount: attention.length'), "Search & Attention count comes from real deduplicated backend workflow records");
check(commandCenter.includes('attentionCount') && commandCenter.includes('benovelent:refresh-action-center'), "Command Center consumes authoritative Attention count and refresh events");
check(topbar.includes('/platform/activity') && topbar.includes('benovelent:refresh-action-center'), "Topbar Attention count is backend-driven and refreshable after workflow mutations");

check(sections.includes('/admin/contributions') && sections.includes('/superadmin/contributions'), "Admin and SuperAdmin have canonical contribution history routes");
check(app.includes('/admin/contributions') && app.includes('/superadmin/contributions'), "Admin and SuperAdmin contribution pages are declared");
check(contribution.includes('/contributions') && contribution.includes('Outstanding') && contribution.includes('Payment date'), "Reusable contribution workspace renders canonical contribution history fields");
check(memberContributionRoute.includes('"/contributions"') && memberContributionRoute.includes('isMember'), "Member contribution history endpoint is protected as member-only");
check(!sections.includes('/admin/accounts?tab=contributions'), "Obsolete Admin Accounts contributions navigation is removed");

check(/claim-review-dialog[\s\S]*max-height: calc\(100dvh/.test(portalCss) && /claim-review-body[\s\S]*overflow: auto/.test(portalCss) && /safe-area-inset-bottom/.test(portalCss), "Claim/support review modals use fixed viewport geometry with internal scrolling and safe-area actions");
check(memberClaims.includes('member-claims-search') && memberClaims.includes('member-claims-status') && memberClaims.includes('member-claims-type') && memberClaims.includes('portal-list-summary') && memberClaims.includes('load(page + 1)'), "Member Claims presentation retains scalable server-side search/filter/pagination UI");
check((app.match(/<SmartAssistant/g) || []).length === 1 && !app.includes('!dashboardRoute && !isLogin'), "SmartAssistant is mounted once globally and decides visibility from the current route");
check(!memberDashboard.includes('<SmartAssistant') && !adminDashboard.includes('<SmartAssistant') && !superDashboard.includes('<SmartAssistant'), "Portal dashboard pages do not duplicate the global SmartAssistant mount");

console.log("ALL MASTER PRODUCTION REPAIR V2 CONTRACTS PASSED");
