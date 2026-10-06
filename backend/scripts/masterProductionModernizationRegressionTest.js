const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const assert = (condition, message) => { if (!condition) throw new Error(`FAIL: ${message}`); console.log(`PASS: ${message}`); };

const claimModels = ["MedicalSupport", "FuneralSupport", "EducationSupport", "SupportRequest"].map((name) => read(`backend/models/${name}.js`)).join("\n");
const claimController = read("backend/controllers/claimWorkflowController.js");
const claimRoutes = read("backend/routes/claimWorkflowRoutes.js");
const adminClaims = read("src/pages/admin/AdminClaims.jsx");
const dependent = read("backend/models/Dependent.js");
const dependentMigration = read("backend/migrations/014_remove_dependent_obsolete_education_fields.js");
const repayment = read("backend/controllers/educationSupportController.js");
const contribution = read("src/components/contributions/ContributionWorkspace.jsx");
const contributionController = read("backend/controllers/contributionController.js");
const finance = read("backend/models/Finance.js");
const theme = read("src/utils/theme.js");
const settings = read("backend/models/SystemSettings.js");
const themeBootstrap = read("src/components/ThemeBootstrap.jsx");
const settingsUi = read("src/pages/superadmin/SuperAdminSettings.jsx");
const print = read("src/utils/printHead.js");
const app = read("src/App.jsx");
const modalA11y = read("src/hooks/useDialogAccessibility.js");
const publicFiles = [
  "src/pages/Home.jsx", "src/pages/About.jsx", "src/pages/Services.jsx", "src/pages/Leaders.jsx",
  "src/pages/Constitution.jsx", "src/pages/Gallery.jsx", "src/pages/News.jsx", "src/pages/Contact.jsx",
  "src/pages/PrivacyPolicy.jsx", "src/pages/TermsConditions.jsx", "src/pages/Disclaimer.jsx", "src/pages/VerifyMembership.jsx"
].filter(exists);

assert(/path="\/admin\/claims"[\s\S]*AdminClaims/.test(app) && /path="\/superadmin\/claims"[\s\S]*AdminClaims/.test(app), "Admin and SuperAdmin use the same claims workspace implementation");
for (const field of ["createdByModel", "processedByModel", "updatedByModel", "approvedByModel", "hiddenByModel", "deletedByModel", "publishedByModel"]) {
  assert(claimModels.includes(field), `Claim models expose explicit ${field} provenance`);
}
assert(/refPath:\s*["']createdByModel/.test(claimModels) && /refPath:\s*["']processedByModel/.test(claimModels), "Claim actor IDs use dynamic model references instead of Admin-only references");
assert(!/paymentReference\s*:/.test(claimModels) && !/paymentReference/.test(claimController) && !/Payment reference/i.test(adminClaims), "Active claim workflow contains no free-text claim payment reference");
assert(/settlementTransactionId/.test(claimModels) && /settlementTransactionId/.test(claimController), "Claims link payment state to authoritative settlement transactions");
assert(/if \(!isSuperAdmin && !validateTransition/.test(claimController), "Admin claim transitions remain restricted while SuperAdmin bypasses sequencing");
assert(/STAGES\.includes\(nextStatus\)/.test(claimController) && /!isSuperAdmin && !validateTransition/.test(claimController), "SuperAdmin stage correction remains constrained to valid stages");
assert(/POST \/:type\/:id\/unhide|router\.post\("\/:type\/:id\/unhide"/.test(claimRoutes), "Claim unhide endpoint exists");
assert(/CLAIM_HIDDEN_FROM_MEMBER/.test(claimController) && /CLAIM_UNHIDDEN_FOR_MEMBER/.test(claimController), "Hide and unhide create explicit audit actions");
assert(/memberVisible:\s*\{\s*\$ne:\s*false\s*\}/.test(read("backend/controllers/memberController.js")), "Hidden claims are excluded from member-facing claim aggregation");
assert(/exports\.permanentDeleteImpact/.test(claimController) && /exports\.permanentDelete/.test(claimController) && /await result\.claim\.deleteOne\(\)/.test(claimController), "SuperAdmin permanent claim deletion has an impact preview and authoritative delete");
assert(/Only SuperAdmin can permanently delete claims/.test(claimController) && !/CLOSED_ONLY/.test(claimController), "Permanent claim deletion is SuperAdmin-only and not limited to closed stages");
assert(/Finance\.findById/.test(claimController) && /preserve settlement evidence/i.test(claimController), "Permanent claim deletion preserves settlement/financial evidence");
assert(/CLAIM_PUBLISHED_TO_NEWS/.test(claimController) && /buildPublicClaimNews/.test(claimController) && /CLAIM_ALREADY_PUBLISHED/.test(claimController), "Claim-to-News publication is public-safe, audited, and duplicate-protected");
assert(/publishedBy/.test(claimController) && /publishedByModel/.test(claimController), "Claim publication provenance is persisted and returned");

assert(!/school\s*:/.test(dependent) && !/educationLevel\s*:/.test(dependent), "Canonical Dependent model no longer contains school or educationLevel");
assert(/\$unset/.test(dependentMigration) && /school/.test(dependentMigration) && /educationLevel/.test(dependentMigration), "Dependent cleanup migration safely unsets obsolete fields");
assert(/populate\("dependent"/.test(claimController) && !/dependent.*school|dependent.*educationLevel/.test(claimController), "Claim details populate current canonical Dependent fields only");
assert(/medicalConditions/.test(claimController) && /isNextOfKin/.test(claimController), "Claim details include the full current canonical Dependent field set");
assert(/paymentTransactionId/.test(repayment) && /DUPLICATE_MPESA_REPAYMENT/.test(repayment) && !/reference:\s*\{\s*type:\s*String/.test(read("backend/models/EducationSupport.js")), "Education repayment uses verified M-PESA transactions rather than manual references");

assert(/Payroll contribution history/.test(contribution) || /Payroll/.test(contribution), "Contribution workspace distinguishes payroll contribution accounting");
assert(/\/member\/mpesa-records/.test(read("src/pages/member/Contributions.jsx")) && /M-PESA Records/.test(read("src/pages/member/MpesaRecords.jsx")), "Member contribution history links to a separate M-PESA records domain");
assert(/sourceId/.test(finance) && /sourceModel/.test(finance) && /approvedByModel/.test(contributionController), "Contribution/Finance records carry source/provenance fields");
assert(/API\.put\(`?\/contributions\//.test(contribution) && /API\.delete\(`?\/contributions\//.test(contribution), "Admin/SuperAdmin contribution workspace exposes live edit/archive controls");

const semanticVars = { primary:"--color-primary", secondary:"--color-secondary", background:"--color-background", surface:"--color-surface", elevatedSurface:"--color-surface-elevated", text:"--color-text", mutedText:"--color-text-muted", border:"--color-border", focus:"--color-focus", success:"--color-success", warning:"--color-warning", danger:"--color-danger", header:"--color-header", sidebar:"--color-sidebar", buttons:"--color-buttons", links:"--color-links" };
for (const [key, cssVar] of Object.entries(semanticVars)) assert(theme.includes(`"${cssVar}"`) || theme.includes(`'${cssVar}'`), `Theme utility supports semantic ${key} token`);
assert(/preset:/.test(settings) && /primary:/.test(settings) && /background:/.test(settings), "SystemSettings stores normalized semantic branding values");
assert(/THEME_PRESETS/.test(theme) && /THEME_TARGETS/.test(settingsUi) && /type="color"/.test(settingsUi) && /theme-preview/.test(settingsUi), "SuperAdmin Theme Studio supports presets, custom color picker and live semantic control");
assert(/themeContrastWarnings/.test(theme) && /contrast/.test(settingsUi), "Theme Studio validates and warns about color contrast");
assert(/applyTheme/.test(themeBootstrap) && /\/website\/settings/.test(themeBootstrap), "Theme bootstrap applies authoritative SystemSettings branding");

assert(/openPrintDocument/.test(print) && /escapePrintHtml/.test(print) && /sanitizeFilename/.test(print) && /Official Record/.test(print), "Browser print has one reusable modern print-head utility");
const sourceFiles = require("child_process").execFileSync("bash", ["-lc", "rg -l 'window\\.print\\(|window\\.open\\(\\\"\\\"' src --glob '*.js' --glob '*.jsx' || true"], { cwd: ROOT, encoding: "utf8" }).trim().split(/\n/).filter(Boolean);
assert(sourceFiles.length <= 1 && sourceFiles.every((file) => file === "src/utils/printHead.js"), "Only the centralized print utility directly invokes browser printing/popup APIs");
assert(/print-letterhead\.png/.test(print), "Browser print preserves the official letterhead asset");
assert(/document\.write\(html\)/.test(print) && /escapeHtml\(title\)/.test(print), "Print HTML escapes document metadata and inserts the generated safe body");

assert(/useDialogAccessibility\(\)/.test(app) && /MutationObserver/.test(modalA11y) && /event\.key !== "Tab"/.test(modalA11y) && /focusableSelector/.test(modalA11y), "Global dialog accessibility manages focus, focus trapping and restoration");
assert(/env\(safe-area-inset/.test(read("src/styles/feedback-pwa.css")) && /\.pwa-install-overlay/.test(read("src/styles/feedback-pwa.css")), "PWA install dialog is centered with safe-area-aware responsive treatment");
const responsiveCss = read("src/styles/v11-responsive-hardening.css") + read("src/styles/feedback-pwa.css");
assert(/@media\s*\(max-width:\s*560px\)/.test(responsiveCss) && /@media\s*\(max-width:\s*700px\)/.test(responsiveCss) && /@media\s*\(max-width:\s*900px\)/.test(responsiveCss), "Responsive hardening covers narrow-phone, phone and tablet breakpoints");
assert(/min-width:\s*44px|width:\s*44px|height:\s*44px/.test(responsiveCss), "Responsive controls include approximately 44px touch targets");

const banned = /superadmin|what to update|backend|database|CMS|technical system authority|assistant configuration|implementation instructions intended for developers|raw database|administrator can edit this/i;
for (const file of publicFiles) {
  const content = read(file);
  const visibleCandidates = content.replace(/import[\s\S]*?from\s+["'][^"']+["'];?/g, "").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((line) => !/String\(user\?\.role|canDownloadFeedback/.test(line)).join("\n");
  assert(!banned.test(visibleCandidates), `Public page ${file} does not expose internal administration instructions`);
}

console.log("Master Production Modernization regression: PASS");
