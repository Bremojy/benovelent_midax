'use strict';

const VALID_BALANCE_STATUSES = new Set(['approved', 'completed']);
const CREDIT_TYPES = new Set(['contribution', 'income', 'refund']);

function normaliseStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function normaliseType(value) {
  return String(value || '').trim().toLowerCase();
}

function amountOf(row) {
  return Math.abs(Number(row?.amount || 0));
}

function directionFor(row) {
  const type = normaliseType(row?.type);
  return CREDIT_TYPES.has(type) ? 'in' : 'out';
}

function isBalanceAffecting(row) {
  return VALID_BALANCE_STATUSES.has(normaliseStatus(row?.status)) && amountOf(row) > 0;
}

function applyRow(balance, row) {
  if (!isBalanceAffecting(row)) return balance;
  const amount = amountOf(row);
  return balance + (directionFor(row) === 'in' ? amount : -amount);
}

function calculateEntries(rows = [], openingBalance = 0) {
  let running = Number(openingBalance || 0);
  let moneyIn = 0;
  let moneyOut = 0;
  const entries = (Array.isArray(rows) ? rows : []).map((row) => {
    const amount = amountOf(row);
    const direction = directionFor(row);
    const affectsBalance = isBalanceAffecting(row);
    const credit = affectsBalance && direction === 'in' ? amount : 0;
    const debit = affectsBalance && direction === 'out' ? amount : 0;
    moneyIn += credit;
    moneyOut += debit;
    running += credit - debit;
    return {
      ...row,
      amount,
      direction,
      credit,
      debit,
      runningBalance: running,
    };
  });
  return {
    entries,
    totals: { credit: moneyIn, debit: moneyOut, balance: running },
    closingBalance: running,
  };
}

function calculateTotals(rows) {
  let moneyIn = 0;
  let moneyOut = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!isBalanceAffecting(row)) continue;
    if (directionFor(row) === 'in') moneyIn += amountOf(row);
    else moneyOut += amountOf(row);
  }
  return { moneyIn, moneyOut };
}

module.exports = {
  VALID_BALANCE_STATUSES,
  CREDIT_TYPES,
  normaliseStatus,
  normaliseType,
  amountOf,
  directionFor,
  isBalanceAffecting,
  applyRow,
  calculateEntries,
  calculateTotals,
};
