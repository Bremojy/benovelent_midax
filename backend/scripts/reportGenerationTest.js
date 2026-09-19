'use strict';
const { read, assert, pass } = require('./testUtils');
const controller = read('backend/controllers/reportController.js');
const routes = read('backend/routes/adminRoutes.js');
const required = ['openingBalance','moneyIn','moneyOut','closingBalance','currentBookBalance','contributions','supportPayments','claims','members','dependents','auditEvents','ledger'];
for (const field of required) assert(controller.includes(field), `report controller missing ${field}`);
for (const route of ['/reports', '/reports/export.pdf', '/reports/export.csv']) assert(routes.includes(route), `missing report route ${route}`);
assert(/startDate/.test(controller) && /endDate/.test(controller), 'reports must support explicit reporting periods');
pass('management report fields, period filters, and exports are wired');
