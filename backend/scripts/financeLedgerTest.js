'use strict';
const { calculateEntries, calculateTotals, isBalanceAffecting } = require('../services/financeLedgerMath');
const { assert, pass } = require('./testUtils');

const prePeriod = [
  { type: 'contribution', amount: 5000, status: 'approved' },
  { type: 'expense', amount: 1000, status: 'completed' },
  { type: 'income', amount: 250, status: 'pending' },
];
const period = [
  { type: 'refund', amount: 500, status: 'approved' },
  { type: 'support', amount: 750, status: 'completed' },
  { type: 'expense', amount: 10000, status: 'rejected' },
];
const opening = calculateEntries(prePeriod, 0).closingBalance;
assert(opening === 4000, `expected historical opening 4000, got ${opening}`);
assert(isBalanceAffecting(prePeriod[2]) === false, 'pending transactions must not affect authoritative balance');
const calculated = calculateEntries(period, opening);
assert(calculated.closingBalance === 3750, `expected closing 3750, got ${calculated.closingBalance}`);
assert(calculated.entries[0].runningBalance === 4500, 'running balance must carry opening balance into the period');
assert(calculated.entries[1].runningBalance === 3750, 'running balance must update after money out');
const totals = calculateTotals(period);
assert(totals.moneyIn === 500 && totals.moneyOut === 750, 'ledger totals must separate money in and money out');
pass('ledger opening/running/closing math and status filtering verified');
