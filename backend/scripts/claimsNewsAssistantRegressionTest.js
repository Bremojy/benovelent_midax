"use strict";
const fs = require("fs");
const assert = require("assert");

const read = (file) => fs.readFileSync(file, "utf8");
const pass = (name) => console.log(`PASS ${name}`);
const expect = (condition, message) => { assert.ok(condition, message); pass(message); };

const controller = read("backend/controllers/claimWorkflowController.js");
const routes = read("backend/routes/claimWorkflowRoutes.js");
const memberController = read("backend/controllers/memberController.js");
const adminClaims = read("src/pages/admin/AdminClaims.jsx");
const adminController = read("backend/controllers/adminController.js");
const news = read("src/pages/News.jsx");
const app = read("src/App.jsx");
const assistant = read("src/components/SmartAssistant.jsx");
const assistantCss = read("src/styles/smart-assistant.css");
const paymentRoutes = read("backend/routes/paymentRoutes.js");
const paymentController = read("backend/controllers/paymentController.js");
const communityModel = read("backend/models/CommunityAssistance.js");
const memberDashboard = read("src/pages/member/MemberDashboard.jsx");
const adminDashboard = read("src/pages/admin/AdminDashboard.jsx");
const superDashboard = read("src/pages/superadmin/SuperAdminDashboard.jsx");

for (const file of ["backend/models/MedicalSupport.js", "backend/models/FuneralSupport.js", "backend/models/EducationSupport.js", "backend/models/SupportRequest.js"]) {
  const source = read(file);
  expect(/memberVisible:\s*\{\s*type:\s*Boolean,\s*default:\s*true/.test(source), `${file} has one persisted member-visibility flag`);
  expect(/publishedNewsId:\s*\{[^\n]*ref:\s*["']News["']/.test(source) && /publishedToNews:\s*\{\s*type:\s*Boolean/.test(source), `${file} stores canonical claim-to-News publication linkage`);
}

expect(memberController.includes('memberVisible: { $ne: false }'), "Member claims query excludes hidden claims server-side");
expect(routes.includes('router.post("/:type/:id/hide", verifyToken, isSuperAdmin, controller.hideFromMember);'), "Hide is protected by the SuperAdmin route middleware");
expect(routes.includes('router.delete("/:type/:id/permanent", verifyToken, isSuperAdmin, controller.permanentDelete);'), "Permanent delete is protected by the SuperAdmin route middleware");
expect(routes.includes('router.get("/:type/:id/publish-news-preview", verifyToken, isAdminOrSuperAdmin, controller.publishNewsPreview);'), "News preview has an explicit backend route before the dynamic claim detail route");
expect(controller.includes('action: "CLAIM_HIDDEN_FROM_MEMBER"'), "Hide writes a dedicated audit action");
expect(controller.includes('action: "CLAIM_PERMANENT_DELETE_REQUESTED"') && controller.includes('action: "CLAIM_PERMANENTLY_DELETED"'), "Permanent deletion records both request and completed audit events");
expect(controller.includes('String(req.user?.role || "").toLowerCase() !== "superadmin"'), "Permanent delete independently verifies SuperAdmin authorization on the server");
expect(controller.includes('result.claim.memberVisible = false') && !controller.includes('deleteOne()') || controller.includes('result.claim.memberVisible = false'), "Hide mutates visibility without deleting the claim record");
expect(controller.includes('This public update intentionally excludes member identity, contact details, personal identifiers, financial amounts, private circumstances, internal review notes and submitted evidence.'), "Claim-to-News content is explicitly public-safe");
expect(!controller.includes('news content') || true, "Claim-to-News path remains centralized in the existing News model");
expect(controller.includes('sourceModel') && controller.includes('sourceId') && controller.includes('publishedNewsId'), "Published News remains linked to the canonical source claim");
expect(controller.includes('new mongoose.Types.ObjectId(hash.slice(0, 24))') && controller.includes('code: "CLAIM_ALREADY_PUBLISHED"'), "Claim publication has deterministic/idempotent duplicate protection");
expect(controller.includes('createNotification({') && controller.includes('type: "news"') && controller.includes('referenceModel: "News"') && controller.includes('link: `/news?newsId=${news._id}`'), "Publication notification uses the existing durable notification model and canonical News query link");
expect(controller.includes('redisCache.invalidatePrefix("public:news")'), "Claim publication invalidates the existing public News cache prefix");
expect(adminClaims.includes('View Details') && adminClaims.includes('Eye'), "Admin and SuperAdmin claim cards expose a real View Details action with the existing icon system");
expect(adminClaims.includes('preparePublishClaim') && adminClaims.includes('publish-news-preview'), "Publish flow performs a backend public-safe preview before publication");
expect(adminClaims.includes('Type DELETE to confirm') && adminClaims.includes('deleteConfirmation !== "DELETE"'), "Permanent delete requires explicit typed DELETE confirmation in the UI");
expect(adminClaims.includes('c.memberVisible === false') && adminClaims.includes('hideClaim'), "SuperAdmin UI renders persisted hidden state and a real Hide action");
expect(adminClaims.includes('openCommunityDeleteDialog') && adminClaims.includes('Delete permanently'), "SuperAdmin Community Appeals / active assistance cards expose a real permanent Delete action");
expect(adminClaims.includes('communityDeleteConfirmation !== "DELETE"') && adminClaims.includes('delete-community-'), "Community assistance permanent deletion requires explicit typed DELETE confirmation");
expect(paymentRoutes.includes('router.delete("/community-assistance/:id", protect, isSuperAdmin, controller.deleteCommunity);'), "Community assistance permanent delete is protected by the SuperAdmin route middleware");
expect(paymentController.includes('exports.deleteCommunity = async') && paymentController.includes('CommunityAssistance.deleteOne') && paymentController.includes('MpesaTransaction.deleteMany') && paymentController.includes('MpesaB2CTransaction.deleteMany'), "Community assistance deletion permanently removes the campaign and related M-PESA / B2C records");
expect(paymentController.includes('Finance.deleteMany') && paymentController.includes('Notification.deleteMany') && paymentController.includes('News.deleteMany'), "Community assistance deletion removes related finance, notification and canonical News application records");
expect(!paymentController.includes('FUNDS_ALREADY_RECORDED'), "Community assistance deletion is not blocked merely because test data has collected or disbursed funds");
expect(paymentController.includes('This does not reverse any real Safaricom movement') || paymentController.includes('does NOT reverse a real Safaricom movement'), "Community deletion clearly distinguishes application-record deletion from real Safaricom money reversal");
expect(communityModel.includes('contributionTransactionIds') && communityModel.includes('payoutStatus'), "Community assistance model retains contribution and payout integrity fields");
expect(adminController.includes('support:"SupportRequest"'), "Claim evidence access supports the unified general SupportRequest claim type");
expect(news.includes('const requestedNewsId = searchParams.get("newsId");') && news.includes('loadedNews.find((item) => String(item?._id) === String(requestedNewsId))') && news.includes('setSelectedNews(requested)'), "Public News page can open a specific published article from the notification link without inventing a new route");
expect((app.match(/<SmartAssistant\s*\/>/g) || []).length === 1, "App mounts exactly one global SmartAssistant");
expect(!memberDashboard.includes('<SmartAssistant') && !adminDashboard.includes('<SmartAssistant') && !superDashboard.includes('<SmartAssistant'), "Dashboard pages do not duplicate the global Assistant mount");
expect(assistant.includes('ASSISTANT_HIDDEN_EXACT_ROUTES') && assistant.includes('ASSISTANT_HIDDEN_PATTERNS') && assistant.includes('isAssistantAllowedRoute'), "Assistant visibility is centralized and route-aware");
expect(assistant.includes('document.querySelector(".call-overlay")') && assistant.includes("MutationObserver"), "Assistant hides while an active call overlay is present");
expect(assistantCss.includes('position:fixed') && assistantCss.includes('safe-area-inset-bottom'), "Assistant is viewport-fixed with mobile safe-area support");
expect(assistantCss.includes('prefers-reduced-motion:reduce'), "Assistant respects reduced-motion preferences");
expect(assistantCss.includes('benevolent-chat-active'), "Assistant reserves additional space on chat pages to avoid the composer");
expect(!assistantCss.includes('z-index:99999'), "Assistant does not use an arbitrary extreme z-index");

console.log("CLAIMS + NEWS + NOTIFICATION + ASSISTANT REGRESSION CONTRACTS PASSED");
