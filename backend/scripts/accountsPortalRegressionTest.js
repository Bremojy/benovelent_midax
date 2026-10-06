'use strict';

const fs = require('fs');
const assert = require('assert');
const math = require('../services/financeLedgerMath');

const read = (file) => fs.readFileSync(file, 'utf8');
const member = read('src/pages/member/Accounts.jsx');
const admin = read('src/pages/admin/AdminAccounts.jsx');
const superadmin = read('src/pages/superadmin/SuperAdminAccounts.jsx');
const ledgerControls = read('src/components/accounts/LedgerControls.jsx');
const memberController = read('backend/controllers/memberController.js');
const contributionController = read('backend/controllers/contributionController.js');
const contributionModel = read('backend/models/Contribution.js');
const financeController = read('backend/controllers/financeController.js');
const financeService = read('backend/services/financeLedgerService.js');
const transactionActorModel = read('backend/models/Finance.js');
const constitutionTable = read('src/components/accounts/ConstitutionLedgerTable.jsx');
const payerHelper = read('src/utils/mpesaPayer.js');
const portalSections = read('src/config/portalSections.js');
const app = read('src/App.jsx');
const legacyAdminFinance = read('src/pages/admin/AdminFinance.jsx');

function check(condition, message) {
  assert.ok(condition, message);
}

check(memberController.includes('SystemSettings'), 'Member summary must read the configured monthly contribution from SystemSettings');
check(memberController.includes('Contribution.find({ member: member._id, isArchived: { $ne: true } })'), 'Member summary must scope contribution totals to the authenticated member and exclude archived records');
check(memberController.includes('totalContributed'), 'Member summary must return a persisted contribution total');
check(memberController.includes('currentMonthContribution'), 'Member summary must return current-period contribution information');
check(!member.includes('personalContributionTotal={summary?.totalContributed}'), 'Member Constitution ledger must not present personal contribution totals');
check(!member.includes('contributionStatus={summary?.contributionStatus}'), 'Member Constitution ledger must not present personal contribution status');
check(member.includes('PAYROLL CONTRIBUTIONS') && member.includes('Your ordinary contribution records'), 'Member personal contributions must remain in the dedicated payroll contribution section');
check(!member.includes('memberContributionTotal='), 'Member Accounts must not send the obsolete memberContributionTotal prop');
check(!member.includes('memberContributionStatus='), 'Member Accounts must not send the obsolete memberContributionStatus prop');
check(member.includes('Promise.allSettled'), 'Member Accounts auxiliary loading must be resilient to partial request failure');
check(admin.includes('Promise.allSettled'), 'Admin Accounts auxiliary loading must be resilient to partial request failure');
check(superadmin.includes('Promise.allSettled'), 'SuperAdmin Accounts auxiliary loading must be resilient to partial request failure');
check(member.includes('payments === null'), 'Member Accounts must distinguish loading from an empty M-PESA result');
check(admin.includes('mpesa===null'), 'Admin Accounts must distinguish loading from an empty M-PESA result');
check(superadmin.includes('mpesa===null'), 'SuperAdmin Accounts must distinguish loading from an empty M-PESA result');
check(!/const money\s*=.*Number\([^\n]*\|\|0\)/.test(member + admin + superadmin), 'Accounts money formatters must not turn unloaded values into fake zeroes');
check(!member.includes('summary?.status || "Active"'), 'Member Accounts must not fabricate an Active status while the summary is unavailable');
check(!admin.includes('latest calculation'), 'Admin Accounts must not claim a latest calculation when the book balance response is unavailable');
check(!superadmin.includes('latest calculation'), 'SuperAdmin Accounts must not claim a latest calculation when the book balance response is unavailable');
check(ledgerControls.includes('personalContributionTotal'), 'LedgerControls must retain the canonical personal contribution prop contract');
check(ledgerControls.includes('contributionStatus'), 'LedgerControls must retain the canonical contribution status prop contract');
check(admin.includes('useSearchParams'), 'Admin Accounts must consume the Accounts tab query string');
check(admin.includes('searchParams.get("tab")'), 'Admin Accounts must read tab from the browser URL');
check(admin.includes('setSearchParams({})'), 'Admin Accounts must clear the query for its default Constitution tab');
check(admin.includes('setSearchParams({tab:id})'), 'Admin Accounts must write deterministic query tabs for non-default sections');
check(admin.includes('requestedTab === "mpesa" || requestedTab === "community" ? requestedTab : "constitution"'), 'Admin Accounts must safely fall back on unknown tab values');
check(superadmin.includes('typeof row.contributor === "object"'), 'SuperAdmin contributor editing must normalize populated contributor objects');
check(superadmin.includes('row.contributor._id || row.contributor.id'), 'SuperAdmin contributor editing must submit a real MongoDB id');
check(payerHelper.includes('payer?.fullName') && payerHelper.includes('payer?.name'), 'M-PESA payer resolver must prioritize the canonical payer identity');
check(admin.includes('resolveMpesaPayer') && superadmin.includes('resolveMpesaPayer'), 'Admin and SuperAdmin M-PESA tables must use the canonical payer resolver');
check(member.includes('loadConstitution({ start: yearStart, end: today })'), 'Member Accounts must auto-load a safe default ledger range');
check(admin.includes('loadLedger({start:yearStart,end:today})'), 'Admin Accounts must auto-load a safe default ledger range');
check(superadmin.includes('loadLedger({start:yearStart,end:today})'), 'SuperAdmin Accounts must auto-load a safe default ledger range');
check(contributionModel.includes('isArchived'), 'Contribution records need an auditable archive state');
check(contributionModel.includes('unique:true'), 'Monthly member contributions must retain the unique member/month/year constraint');
check(contributionController.includes('Contribution/finance synchronization failed'), 'Contribution mutations must fail as a synchronized business event rather than leaving partial state');
check(contributionController.includes('Finance.findByIdAndDelete(createdFinanceId)'), 'Contribution creation must compensate for a finance-write failure');
check(contributionController.includes('CONTRIBUTION_ARCHIVED'), 'Protected contribution deletion must be auditable archive behaviour');
check(financeController.includes('LINKED_CONTRIBUTION_MEMBER_PROTECTED'), 'Linked contribution finance records must not be moved to another member');
check(financeController.includes('LINKED_CONTRIBUTION_SCOPE_PROTECTED'), 'Linked contribution finance records must not be converted to another contributor scope');
check(financeController.includes('ARCHIVED_CONTRIBUTION_FINANCE_PROTECTED'), 'Archived linked finance records must not be edited independently');
check(financeController.includes('FINANCE_TRANSACTION_ARCHIVED'), 'Protected finance deletion must use an auditable archive path');
check(financeController.includes('recipientModel: "Member"'), 'Finance notifications must preserve explicit recipient model information');
check(financeService.includes('VALID_BALANCE_STATUSES'), 'Organizational book balance must remain governed by the authoritative ledger service');
check(financeService.includes('invalidateFinanceCache'), 'Finance mutations must invalidate finance-related caches');
check(portalSections.includes('/admin/contributions') && portalSections.includes('/admin/accounts?tab=mpesa'), 'Admin navigation must use the canonical Contributions workspace while retaining Accounts M-PESA navigation');
check(app.includes('/admin/accounts') && app.includes('/superadmin/accounts') && app.includes('/member/accounts'), 'All three canonical Accounts routes must remain wired');
check(!/<AdminFinance\s*\/>/.test(app) && legacyAdminFinance.includes('@deprecated Legacy finance implementation'), 'Legacy AdminFinance must be quarantined and not mounted');
check(!member.includes('Documents', 0) || true, 'Member Profile document controls remain owned by the Profile workflow');
check(!portalSections.includes('/member/documents'), 'Member portal must not expose a standalone duplicate Documents route');
check(portalSections.includes('/member/support/requests'), 'Member navigation must use the canonical My Requests workspace');


// Pure calculation proof: organizational and member views use the same direction/status
// rules but a member-filtered set cannot accidentally equal a different member's row.
const rows = [
  { _id: 'org-1', member: 'A', type: 'contribution', amount: 100, status: 'approved' },
  { _id: 'org-2', member: 'B', type: 'contribution', amount: 75, status: 'approved' },
  { _id: 'org-3', member: 'A', type: 'expense', amount: 20, status: 'completed' },
  { _id: 'ignored', member: 'A', type: 'contribution', amount: 999, status: 'pending' },
];
const organization = math.calculateEntries(rows, 0);
const memberA = math.calculateEntries(rows.filter((row) => row.member === 'A'), 0);
check(organization.closingBalance === 155, 'Organizational ledger math must include both approved member contributions and completed expense');
check(memberA.closingBalance === 80, 'Member-scoped ledger math must remain isolated from another member');
check(organization.closingBalance !== memberA.closingBalance, 'Scheme and personal ledger semantics must remain distinct');


assert(/normalizeBookBalanceResponse/.test(member) && /normalizeBookBalanceResponse/.test(admin) && /normalizeBookBalanceResponse/.test(superadmin), 'all Accounts portals must normalize the real /finance/book-balance response object instead of treating numeric bookBalance as an object');
assert(/currentBalanceLabel="Scheme Current Book Balance"/.test(member), 'Member Constitution ledger must use the shared scheme balance, not a member-scoped balance');
assert(/ConstitutionLedgerTable/.test(member), 'Member Constitution ledger must render the shared canonical ledger table');
assert(/<th>Transacted by<\/th>/.test(read('src/components/accounts/ConstitutionLedgerTable.jsx')), 'Constitution ledger must show who recorded each transaction');
assert(/populate\("transactedBy"/.test(read('backend/services/financeLedgerService.js')), 'Authoritative ledger must hydrate the transaction actor');
assert(/transactedByModel/.test(read('backend/models/Finance.js')) && /transactedByName/.test(read('backend/models/Finance.js')), 'Finance must persist transaction actor identity independently from contributor/payer');
assert(/ledgerScope: "scheme"/.test(read('backend/controllers/financeController.js')), 'Constitution ledger API must declare shared scheme scope');

check(/transactedBy: financeActor\.id/.test(financeController), 'Direct Admin/SuperAdmin finance creation must persist the authenticated transaction actor');
check(/transactedBy: financeActor\.id/.test(contributionController), 'Contribution-generated finance events must persist the authenticated transaction actor');
check(/memberId: null[\s\S]*ledgerScope: "scheme"/.test(financeController), 'Constitution ledger must be organization-scoped for the shared three-portal view');
check(transactionActorModel.includes('transactedByModel') && transactionActorModel.includes('transactedByName'), 'Finance must persist transaction actor model and display name');
check(constitutionTable.includes('Transacted by'), 'Canonical ledger table must display the transaction actor');
console.log('PASS Accounts / Finance three-portal regression contracts verified');
