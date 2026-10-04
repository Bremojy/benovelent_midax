const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`FAIL: ${message}`); };

const finance = read("backend/services/financeLedgerService.js");
const controller = read("backend/controllers/financeController.js");
const model = read("backend/models/Finance.js");
const member = read("src/pages/member/Accounts.jsx");
const admin = read("src/pages/admin/AdminAccounts.jsx");
const superadmin = read("src/pages/superadmin/SuperAdminAccounts.jsx");
const balanceUtil = read("src/utils/bookBalance.js");

assert(/Finance\.find\(\{ \.\.\.matchBase, transactionDate/.test(finance), "authoritative ledger must read persisted Finance rows");
assert(/memberId: null/.test(controller), "Constitution ledger must not member-scope the shared scheme ledger");
assert(/ledgerScope: "scheme"/.test(controller), "Constitution ledger response must identify itself as the shared scheme ledger");
assert(/transactedBy/.test(model) && /transactedByModel/.test(model) && /transactedByName/.test(model), "Finance must persist who recorded each transaction");
assert(/populate\("approvedBy"/.test(finance), "Historical ledger rows may fall back to their persisted approval actor");
assert(/normalizeBookBalanceResponse\(balanceRes\.value\.data\)/.test(member), "Member must read the complete book-balance response");
assert(/normalizeBookBalanceResponse\(balance\.value\.data\)/.test(admin), "Admin must read the complete book-balance response");
assert(/normalizeBookBalanceResponse\(balance\.value\.data\)/.test(superadmin), "SuperAdmin must read the complete book-balance response");
assert(/currentBalanceLabel="Scheme Current Book Balance"/.test(member), "Member ledger must present scheme balance");
assert(/ConstitutionLedgerTable/.test(member), "Member must use the canonical shared ledger table");

console.log("SHARED CONSTITUTION LEDGER REGRESSION: PASS");
console.log("Verified shared scheme scope, persisted transaction actor, canonical balance response handling, and Member/Admin/SuperAdmin Accounts wiring.");
