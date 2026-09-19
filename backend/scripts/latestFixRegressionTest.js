
'use strict';
const { read, exists, assert, pass } = require('./testUtils');

const superadmin = read('backend/controllers/superadminController.js');
const financeController = read('backend/controllers/financeController.js');
const reportController = read('backend/controllers/reportController.js');
const simplePdf = read('backend/utils/simplePdf.js');
const dataIntegrity = read('backend/controllers/dataIntegrityController.js');
const frontendPrint = [
  read('src/components/member/ContributionHistory.jsx'),
  read('src/pages/admin/AdminReports.jsx'),
  read('src/pages/Feedback.jsx'),
  read('src/pages/News.jsx'),
];
const integrityPrint = read('src/pages/superadmin/SuperAdminDataIntegrity.jsx');

assert(/const \{ getCurrentBookBalance \} = require\("\.\.\/services\/financeLedgerService"\);/.test(superadmin), 'SuperAdmin overview imports the authoritative live book balance service');
assert(/let action = "deleted"/.test(financeController) && /action = "archived"/.test(financeController), 'finance deletion always executes as delete or audit archive');
assert(!/code: "SETTLED_FINANCE_PROTECTED"/.test(financeController), 'settled finance delete no longer returns the blocking policy error');
assert(/createAuditLog\(/.test(financeController) && /FINANCE_TRANSACTION_ARCHIVED/.test(financeController), 'finance archive/delete writes an audit event');
assert(/Midax Petroleum Marketing/.test(reportController) && /P\.O\. Box 7432/.test(reportController), 'management CSV contains the application printhead identity');
assert(/assets.*print-letterhead\.jpg/.test(simplePdf) && /\/Im1 Do/.test(simplePdf), 'server-generated PDFs embed the existing Benevolent printhead asset');
assert(exists('backend/assets/print-letterhead.jpg'), 'server printhead JPEG asset exists');
assert(/letterheadDataUri/.test(dataIntegrity) && /print-letterhead\.png/.test(dataIntegrity), 'human-readable database print/download embeds the same printhead');
for (const page of frontendPrint) assert(/openPrintDocument/.test(page), 'print action uses shared printhead document helper');
assert(/buildPrintHeadHtml/.test(integrityPrint) && /printHeadStyles/.test(integrityPrint), 'integrity report print action uses the shared printhead markup/styles');
pass('latest production-error fixes, delete execution and printhead coverage verified');
