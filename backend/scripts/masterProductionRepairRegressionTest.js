"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`FAIL: ${message}`); };
const pass = (message) => console.log(`MASTER PRODUCTION REPAIR REGRESSION: PASS — ${message}`);

const support = read("src/pages/member/Support.jsx");
const funeralController = read("backend/controllers/funeralSupportController.js");
const funeralRoutes = read("backend/routes/funeralSupportRoutes.js");
const funeralModel = read("backend/models/FuneralSupport.js");
const dependents = read("src/pages/member/Dependents.jsx");
const dependentController = read("backend/controllers/dependentController.js");
const dependentModel = read("backend/models/Dependent.js");
const adminController = read("backend/controllers/adminController.js");
const adminModal = read("src/pages/superadmin/SuperAdminAdmins.jsx");
const adminCss = read("src/pages/superadmin/SuperAdminAdmins.css");
const pwa = read("src/components/InstallPWA.jsx");
const pwaCss = read("src/styles/feedback-pwa.css");
const messageBubble = read("src/components/chat/MessageBubble.jsx");
const financeService = read("backend/services/financeLedgerService.js");

assert((support.match(/requiredFiles\.burialPermitChiefLetter/g) || []).length >= 2, "Funeral Support uses one combined required file state");
assert(support.includes('label="Burial Permit / Chief or Local Authority Letter"'), "Funeral Support label matches the required business wording");
assert(support.includes('formData.append("burialPermitChiefLetter"'), "Funeral Support posts the authoritative multipart field");
assert(!support.includes('requiredFiles.deathCertificate') && !support.includes('requiredFiles.burialPermit}') && !support.includes('requiredFiles.chiefLetter'), "Funeral Support member UI no longer contains the three separate required fields");
assert(funeralRoutes.includes('{ name: "burialPermitChiefLetter", maxCount: 1 }'), "Funeral route accepts exactly one combined required upload field");
assert(!funeralRoutes.includes('{ name: "deathCertificate"') && !funeralRoutes.includes('{ name: "burialPermit"') && !funeralRoutes.includes('{ name: "chiefLetter"'), "Funeral route no longer accepts the three obsolete required fields");
assert(funeralController.includes('req.files?.burialPermitChiefLetter?.[0]') && funeralController.includes('REQUIRED_DOCUMENT_MISSING'), "Funeral controller validates the combined required document");
assert(funeralModel.includes('burialPermitChiefLetter') && funeralModel.includes('deathCertificate') && funeralModel.includes('burialPermit') && funeralModel.includes('chiefLetter'), "Funeral model preserves legacy fields while adding the current field");

for (const obsolete of ["birthCertificateNumber", "school", "admissionNumber", "educationLevel", "occupation", "employer"]) {
  assert(!dependents.includes(`form.${obsolete}`), `member dependent form no longer controls ${obsolete}`);
  assert(!dependents.includes(`${obsolete}: ""`), `member dependent form state no longer declares ${obsolete}`);
  assert(!dependentController.includes(`MEMBER_EDIT_FIELDS = ["${obsolete}"`), `dependent member-edit field list no longer starts with ${obsolete}`);
}
assert(dependents.includes('label="Employment Status"'), "Dependent form exposes Employment Status");
for (const status of ["Employed", "Not employed", "Studying", "Prefer not to say"]) assert(dependents.includes(`<option>${status}</option>`) || dependents.includes(`<option value="${status}">${status}</option>`), `Employment Status option ${status} exists`);
assert(/MEMBER_EDIT_FIELDS = \[.*employmentStatus/.test(dependentController), "Dependent member-edit contract contains employmentStatus and excludes legacy fields");
assert(/DEPENDENT_EMPLOYMENT_STATUSES = \["Employed", "Not employed", "Studying", "Prefer not to say"\]/.test(dependentController), "Backend enforces the four Employment Status options");
assert(/enum:\[\s*"Employed",\s*"Not employed",\s*"Studying",\s*"Prefer not to say"/.test(dependentModel), "Dependent model constrains Employment Status");

const verifyStart = adminController.indexOf('exports.verifyMember =');
const verifyEnd = adminController.indexOf('/* =====================================================\n   SUSPEND MEMBER', verifyStart);
const verifyBlock = adminController.slice(verifyStart, verifyEnd);
assert(/await member\.save\(\)/.test(verifyBlock), "verification persists the member before side effects");
assert(/Promise\.allSettled\(\[/.test(verifyBlock), "verification side effects are isolated from the core database save");
assert(/createNotification\(/.test(verifyBlock) && /redisCache\.invalidateMany/.test(verifyBlock), "verification includes notification and cache side effects");
assert(/await Member\.findById\(member\._id\)/.test(verifyBlock) && /sanitizeMemberForClient\(verifiedMember\)/.test(verifyBlock), "verification response re-fetches authoritative member state");

assert(adminModal.includes('className="admin-form-actions"') && adminModal.includes('Cancel') && adminModal.includes('Create Administrator'), "Administrator modal contains the two required actions");
assert(adminCss.includes('.admin-modal {') && adminCss.includes('max-height: min(92dvh, 920px)') && adminCss.includes('.admin-form-actions {') && adminCss.includes('position: sticky'), "Administrator modal keeps actions reachable while the form scrolls");
assert(pwa.includes('className="pwa-install-overlay"'), "PWA install request is rendered inside a dedicated fixed overlay");
assert(pwaCss.includes('.pwa-install-overlay {') && pwaCss.includes('place-items: center') && pwaCss.includes('max-height: min(78dvh, 560px)'), "PWA prompt is centrally positioned and viewport-safe");
assert(pwaCss.includes("bottom: auto !important") && pwaCss.includes("left: auto !important") && pwaCss.includes("transform: none !important"), "Final PWA cascade removes bottom anchoring and horizontal transforms");

assert(!messageBubble.includes('message-reaction-add'), "Redundant per-message plus reaction control is removed");
assert(/document\.addEventListener\("pointerdown", handleOutside, true\)/.test(messageBubble), "Chat context menu closes on outside pointer/touch interactions");
assert(/window\.addEventListener\(ACTION_MENU_EVENT/.test(messageBubble), "Chat context menu keeps one-open-menu coordination");
assert(/document\.addEventListener\("keydown", handleKeyDown\)/.test(messageBubble), "Escape dismissal remains wired");

assert(/getCurrentBookBalance/.test(financeService) && /invalidateFinanceCache/.test(financeService), "Finance ledger has an authoritative server-side balance and cache invalidation service");

const files = [
  "src/pages/member/Support.jsx",
  "backend/routes/funeralSupportRoutes.js",
  "backend/controllers/funeralSupportController.js",
  "backend/models/FuneralSupport.js",
  "src/pages/member/Dependents.jsx",
  "backend/controllers/dependentController.js",
  "backend/models/Dependent.js",
  "backend/controllers/adminController.js",
  "src/pages/superadmin/SuperAdminAdmins.jsx",
  "src/pages/superadmin/SuperAdminAdmins.css",
  "src/components/InstallPWA.jsx",
  "src/styles/feedback-pwa.css",
  "src/components/chat/MessageBubble.jsx",
];
for (const file of files) assert(fs.existsSync(path.join(root, file)), `modified source file exists: ${file}`);

pass("funeral single-document contract, dependent field contract, verification side-effect isolation, administrator modal reachability, PWA mobile positioning, chat reaction/menu behavior, and finance authority checks verified");
