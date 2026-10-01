'use strict';
const vm = require('node:vm');
const { read, assert, pass } = require('./testUtils');

const helperSource = read('src/utils/ledgerDateRange.js')
  .replace(/export const /g, 'const ')
  .replace(/export default[^\n]*\n?/g, '');
const helperCode = `${helperSource}\nthis.__ledger = { getDefaultLedgerRange, normalizeLedgerDateRange, toDateInputValue };`;
const context = {};
vm.runInNewContext(helperCode, context, { filename: 'ledgerDateRange.test.js' });

const fixedNow = new Date('2026-10-01T08:00:00.000Z');
const defaults = context.__ledger.getDefaultLedgerRange(fixedNow);
assert(defaults.start === '2026-01-01' && defaults.end === '2026-10-01', 'ledger defaults use first day of current year through today');

assert(context.__ledger.normalizeLedgerDateRange({}).ok, 'blank UI values normalize to valid default dates');
assert(context.__ledger.normalizeLedgerDateRange({ start: '2026-01-01', end: '2026-03-31' }).ok, 'explicit YYYY-MM-DD date ranges are accepted');
assert(!context.__ledger.normalizeLedgerDateRange({ start: '2026-02-30', end: '2026-03-01' }).ok, 'impossible calendar dates are rejected');
assert(!context.__ledger.normalizeLedgerDateRange({ start: '01/01/2026', end: '2026-03-01' }).ok, 'non-ISO date formats are rejected');
assert(!context.__ledger.normalizeLedgerDateRange({ start: '2026-10-01', end: '2026-01-01' }).ok, 'reversed ledger ranges are rejected');

const service = read('backend/services/financeLedgerService.js');
assert(service.includes('const LEDGER_DATE_PATTERN = /^\\d{4}-\\d{2}-\\d{2}$/;'), 'authoritative ledger service enforces YYYY-MM-DD input shape');
assert(/parseLedgerDate\(startDate, ['\"]startDate['\"]\)/.test(service) && /parseLedgerDate\(endDate, ['\"]endDate['\"]\)/.test(service), 'authoritative ledger service validates explicit start and end dates');
const controllerSource = read('backend/controllers/financeController.js');
assert((controllerSource.match(/includeHidden: role === \"superadmin\" && String\(req\.query\.includeHidden/g) || []).length >= 3, 'SuperAdmin ledger read and export paths honor explicit includeHidden authorization');
assert(!/Select both a start date and end date first|Select both dates first/.test(read('src/pages/member/Accounts.jsx') + read('src/pages/admin/AdminAccounts.jsx') + read('src/pages/superadmin/SuperAdminAccounts.jsx')), 'ledger UIs no longer use the obsolete date-selection failure');

pass('ledger default/explicit/reversed date contract regression passed');
