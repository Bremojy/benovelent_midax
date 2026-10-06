
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
assert(/if \(role === "superadmin" && !protectedSettled && !linkedContribution\)/.test(financeController) && /action = "deleted"/.test(financeController) && /action = "archived"/.test(financeController), 'finance deletion uses the governed SuperAdmin delete path and preserves protected records through audit archive');
assert(/protectedSettled/.test(financeController) && /action = "archived"/.test(financeController), 'settled or linked finance deletes remain protected by the existing audit/archive policy');
assert(/createAuditLog\(/.test(financeController) && /FINANCE_TRANSACTION_ARCHIVED/.test(financeController), 'finance archive/delete writes an audit event');
assert(/getSystemSettings/.test(reportController) && /report\.organization/.test(reportController), 'management CSV uses authoritative SystemSettings organization metadata');
assert(/assets.*print-letterhead\.jpg/.test(simplePdf) && /\/Im1 Do/.test(simplePdf), 'server-generated PDFs embed the existing Benevolent printhead asset');
assert(exists('backend/assets/print-letterhead.jpg'), 'server printhead JPEG asset exists');
assert(/letterheadDataUri/.test(dataIntegrity) && /print-letterhead\.png/.test(dataIntegrity), 'human-readable database print/download embeds the same printhead');
for (const page of frontendPrint) assert(/openPrintDocument/.test(page), 'print action uses shared printhead document helper');
assert(/openPrintDocument/.test(integrityPrint) && /Human-Readable Database Backup/.test(integrityPrint), 'integrity report print action uses the shared printhead document helper');
pass('latest production-error fixes, delete execution and printhead coverage verified');
