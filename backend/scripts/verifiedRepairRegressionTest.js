const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`FAIL: ${message}`); };

const communityModel = read("backend/models/CommunityAssistance.js");
const mpesaModel = read("backend/models/MpesaTransaction.js");
const paymentController = read("backend/controllers/paymentController.js");
const paymentRoutes = read("backend/routes/paymentRoutes.js");
const claimWorkflow = read("backend/controllers/claimWorkflowController.js");
const notificationService = read("backend/services/notificationService.js");
const mpesaService = read("backend/services/mpesaService.js");
const memberClaims = read("src/pages/member/Claims.jsx");
const adminClaims = read("src/pages/admin/AdminClaims.jsx");
const adminAccounts = read("src/pages/admin/AdminAccounts.jsx");
const adminReports = read("src/pages/admin/AdminReports.jsx");
const adminFinance = read("src/pages/admin/AdminFinance.jsx");

assert(/workflowStatus:\s*\{[\s\S]*community_appeal_pending_review[\s\S]*community_campaign_open/.test(communityModel), "CommunityAssistance must persist review/open workflow states.");
assert(/payerId:\s*\{/.test(mpesaModel) && /payerModel:\s*\{/.test(mpesaModel), "MpesaTransaction must distinguish payer ID and payer role/model.");
assert(!paymentController.includes("resolvePaymentMember"), "Payment controller must not retain the removed member-only resolver.");
assert(/if \(role === "admin" && purpose !== "community_assistance"\)/.test(paymentController), "Admin STK payments must be limited to community assistance.");
assert(/payerId:\s*actor\.id[\s\S]*payerModel:\s*actor\.model/.test(paymentController), "STK transactions must persist payer identity.");
assert(/const actor = await resolvePaymentActor\(req\)/.test(paymentController), "Manual/query flows must resolve the authenticated payer actor.");
assert(/payerModel === "Admin"/.test(paymentController), "Payment notifications must support Admin payer records.");
assert(/workflowStatus = "community_campaign_open"/.test(paymentController), "Authorised campaign opening must set the open workflow state.");
assert(/workflowStatus = "community_campaign_closed"/.test(paymentController), "Closing/payout transition must record the closed workflow state.");
assert(/canContribute:\s*\["member",\s*"admin"\]/.test(paymentController), "Only member/admin roles may receive contribution eligibility from the API.");
assert(/isMemberOrAdminContributionUser/.test(paymentRoutes) && !/router\.post\("\/stk", protect, isContributionUser/.test(paymentRoutes), "Contribution payment routes must exclude SuperAdmin at authorization middleware.");
assert(/reviewCommunityAssistance/.test(claimWorkflow) && /community_appeal_pending_review/.test(claimWorkflow), "Community appeal request/review endpoint must enforce pending-review workflow.");
assert(/Admin = require\("\.\.\/models\/Admin"\)/.test(claimWorkflow) && /SuperAdmin = require\("\.\.\/models\/SuperAdmin"\)/.test(claimWorkflow), "Community appeal reviewer notifications need concrete Admin/SuperAdmin models.");
assert(/eventId/.test(notificationService), "Notification service must accept a caller-supplied idempotency/event ID.");
assert(!mpesaService.includes("650014") && !mpesaService.includes("DEFAULT_MPESA_SHORTCODE") && !mpesaService.includes("DEFAULT_MPESA_ACCOUNT_REFERENCE"), "M-Pesa service must not invent a shortcode/account reference at runtime.");
assert(!adminFinance.includes('||"650014"'), "Admin Finance UI must not invent the M-Pesa shortcode.");
assert(/coverImage/.test(adminReports) && /payload\.append\("coverImage", form\.coverImage\)/.test(adminReports), "Meeting minutes form must upload its selected cover image.");
assert(/submitted for administrator review/.test(memberClaims), "Member UI must accurately show community assistance as pending review.");
assert(/claims\/community\/\$\{appealReview\._id\}\/review/.test(adminClaims), "Admin UI must call the community appeal review endpoint.");
assert(/Approve & open campaign/.test(adminClaims), "Admin UI must expose an explicit approve/open action.");
assert(/MpesaPaymentButton/.test(adminClaims) && /!isSuperAdmin/.test(adminClaims), "Admin UI must allow eligible Admin/leader community contributions and exclude SuperAdmin.");
assert(/payerId\?\.fullName/.test(adminAccounts), "Admin Accounts must display payer identity when the transaction is not a member payment.");

console.log("VERIFIED REPAIR REGRESSION: PASS — verified");
console.log("Checked community workflow, payer-role model, payment authorization, notification idempotency, M-Pesa config defaults, meeting-minutes media upload, and role-aware portal UI contracts.");
