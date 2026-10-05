"use strict";
const fs = require("fs");
const assert = require("assert");
const root = require("path").resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(require("path").join(root, file), "utf8");
const controller = read("backend/controllers/paymentController.js");
const adminClaims = read("src/pages/admin/AdminClaims.jsx");
const superAccounts = read("src/pages/superadmin/SuperAdminAccounts.jsx");
const adminAccounts = read("src/pages/admin/AdminAccounts.jsx");
const checks = [
  [controller.includes('MpesaTransaction.deleteMany'), "all CommunityAssistance M-PESA transactions are deleted"],
  [controller.includes('MpesaB2CTransaction.deleteMany'), "related M-PESA B2C payout records are deleted"],
  [controller.includes('Finance.deleteMany'), "related finance ledger records are deleted"],
  [controller.includes('Notification.deleteMany'), "related notifications are deleted"],
  [controller.includes('News.deleteMany'), "related CommunityAssistance News records are deleted"],
  [controller.includes('CommunityAssistance.deleteOne'), "community assistance request itself is deleted"],
  [!controller.includes('FUNDS_ALREADY_RECORDED'), "funded test requests are not blocked from permanent deletion"],
  [adminClaims.includes('does not reverse money already moved through the real Safaricom M-PESA system'), "SuperAdmin Claims dialog explains real-money non-reversal"],
  [superAccounts.includes('including M-PESA transaction records'), "SuperAdmin Accounts delete confirmation covers M-PESA records"],
  [adminAccounts.includes('including M-PESA transaction records'), "Admin Accounts community delete copy matches the destructive semantics"],
];
for (const [ok, message] of checks) { assert.ok(ok, message); console.log(`PASS ${message}`); }
console.log("COMMUNITY DELETE CASCADE REGRESSION PASSED");
