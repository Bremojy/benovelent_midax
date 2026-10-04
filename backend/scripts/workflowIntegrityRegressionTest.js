const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
};

const dependent = read("src/pages/member/Dependents.jsx");
const dependentRoutes = read("backend/routes/dependentRoutes.js");
const education = read("backend/controllers/educationSupportController.js");
const educationModel = read("backend/models/EducationSupport.js");
const educationRoutes = read("backend/routes/educationSupportRoutes.js");
const payments = read("backend/controllers/paymentController.js");
const medical = read("backend/controllers/medicalSupportController.js");
const funeral = read("backend/controllers/funeralSupportController.js");
const support = read("backend/controllers/supportRequestController.js");
const claims = read("backend/controllers/claimWorkflowController.js");
const adminClaims = read("src/pages/admin/AdminClaims.jsx");
const memberClaims = read("src/pages/member/Claims.jsx");
const settings = read("src/pages/superadmin/SuperAdminSettings.jsx");
const website = read("backend/controllers/websiteController.js");
const websiteRoutes = read("backend/routes/websiteRoutes.js");
const contactRoutes = read("backend/routes/contactRoutes.js");
const contactController = read("backend/controllers/contactController.js");
const contactModel = read("backend/models/ContactMessage.js");
const memberRoutes = read("backend/routes/memberRoutes.js");
const paymentRoutes = read("backend/routes/paymentRoutes.js");
const platformRoutes = read("backend/routes/platformRoutes.js");
const voteRoutes = read("backend/routes/voteRoutes.js");
const adminController = read("backend/controllers/adminController.js");
const adminMembers = read("src/pages/admin/AdminMembers.jsx");
const server = read("backend/server.js");

assert(/await load\(\);/.test(dependent), "approved dependent edit uses the canonical dependent loader after persistence");
assert(/requestedChanges/.test(dependent) && /normalize\(requestedValue\)/.test(dependent), "member dependent edit requests submit an explicit changed-field diff");
assert(/profileCompleted/.test(dependentRoutes) && /\/edit-requests\/mine/.test(dependentRoutes), "member dependent edit-request routes enforce profile completion");

assert(/feeStructureFile/.test(education) && /admissionLetterFile/.test(education) && /REQUIRED_DOCUMENTS_MISSING/.test(education), "Education Support requires its backend-specific document fields");
assert(/Math\.min\(configuredMaximum.*20000/.test(education), "Education Support enforces a hard maximum of KSh 20,000");
assert(/Under Review/.test(education) && /Disbursement Pending/.test(education), "Education Support retains explicit in-process review/disbursement states");
assert(/application\.status !== "Approved"/.test(education) && /Disbursement Pending/.test(education), "Education disbursement cannot mark a case Paid directly");
assert(/after Education Support has been paid and evidenced/.test(education), "manual Education repayment requires evidenced prior payment");
assert(/DUPLICATE_REPAYMENT_REFERENCE/.test(education) && /application\.repayments\.push/.test(education), "manual Education repayment is reference-deduplicated and ledgered");
assert(/reference: \{ type: String/.test(educationModel), "Education repayment records persist a manual payment reference");
assert(/\/:id\/repayment/.test(educationRoutes), "Education repayment has an admin route");
assert(/application\.status === "Paid" \|\| application\.status === "Defaulted"/.test(payments), "M-PESA Education repayment is limited to Paid/Defaulted support");
assert(/purpose === "loan_repayment"/.test(payments), "M-PESA loan repayment maps to EducationSupport");

assert(/Disbursement Pending/.test(medical) && /PAYMENT_EVIDENCE_REQUIRED/.test(medical), "Medical Support cannot be marked Paid without pending disbursement and payment evidence");
assert(/Disbursement Pending/.test(funeral) && /PAYMENT_EVIDENCE_REQUIRED/.test(funeral), "Funeral Support cannot be marked Paid without pending disbursement and payment evidence");
assert(/const allowed =/.test(support) && /Cannot move a/.test(support), "general Support requests enforce server-side stage transitions");
assert(/PAYMENT_EVIDENCE_REQUIRED/.test(support), "general Support Paid/Completed requires payment evidence");
assert(/validateTransition/.test(claims) && /Approved: \["Disbursement Pending", "Closed"\]/.test(claims), "canonical claim workflow blocks direct Approved-to-Paid transitions");
assert(/paymentReference/.test(claims) && /PAID_AMOUNT_REQUIRED/.test(claims), "canonical claim workflow requires payment evidence and paid amount");
assert(/payment-reference/.test(adminClaims) && /selected\.sourceType === "education"/.test(adminClaims), "Admin Claims exposes payment evidence and Education repayment controls");
assert(/purpose="loan_repayment"/.test(memberClaims), "member Claims exposes the real Education M-PESA repayment flow");

assert(/getWebsiteManagementContent/.test(website) && /router\.get\("\/manage", protect, isSuperAdmin/.test(websiteRoutes), "SuperAdmin CMS has an authorized management-content source");
assert(/published: true/.test(website), "public CMS reads filter out unpublished content");
assert(/public:website:settings/.test(website) && /assistant:public/.test(website), "CMS cache invalidation uses centralized authoritative keys");
assert(!/key: "settings", label: "Website Settings"/.test(settings), "duplicate WebsiteContent settings editor is removed from CMS sections");
assert(/API\.put\("\/superadmin\/settings"/.test(settings) && /accentColor: themeColor/.test(settings), "theme changes persist through authoritative SystemSettings");

assert(/router\.post\("\/:id\/reply"/.test(contactRoutes), "contact inbox exposes a reply workflow");
assert(/archiveContactMessage/.test(contactRoutes) && /archiveContactMessage/.test(contactController), "contact delete action is replaced by audited archive behavior");
assert(/replies:/.test(contactModel), "contact replies are persisted with message history");
assert(/DELETE_SUPPORT_REQUEST/.test(support), "SuperAdmin support deletion is audited");
assert(/status = "inactive"/.test(adminController) && /ARCHIVE_MEMBER/.test(adminController), "admin member deletion archives and audits instead of destroying the account");
assert(!/MIDAX@123/.test(adminMembers), "temporary plaintext-password fallback is absent from Admin Members");
assert(/exports\.permanentDelete/.test(claims) && /CLAIM_PERMANENT_DELETE_CLOSED_ONLY/.test(claims) && /await result\.claim\.deleteOne\(\)/.test(claims), "SuperAdmin permanently deletes Closed claims while retaining the legacy archive endpoint separately");
assert(/service is temporarily unavailable/.test(server) && /app\.use\(compression\(\{ threshold: 1024 \}\)\);\napp\.use\(express\.json/.test(server), "5xx implementation errors are sanitized and duplicate compression is removed");
assert(/profileCompleted/.test(memberRoutes) && /profileCompleted/.test(paymentRoutes) && /profileCompleted/.test(platformRoutes) && /profileCompleted/.test(voteRoutes), "member finance/platform/voting routes enforce profile completion");

console.log("ALL WORKFLOW INTEGRITY REGRESSIONS PASSED");
