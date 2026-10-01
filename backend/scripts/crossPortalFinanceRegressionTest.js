const fs = require("fs");
const assert = require("assert");

const financeController = fs.readFileSync("backend/controllers/financeController.js", "utf8");
const adminFinance = fs.readFileSync("src/pages/admin/AdminFinance.jsx", "utf8");
const adminAccounts = fs.readFileSync("src/pages/admin/AdminAccounts.jsx", "utf8");
const superAdminAccounts = fs.readFileSync("src/pages/superadmin/SuperAdminAccounts.jsx", "utf8");

assert(/type === "contribution" && scope === "member"/.test(financeController), "Finance creation distinguishes member payroll contributions for cross-portal synchronization");
assert(/Contribution\.findOne\(\{\s*member: memberId,\s*month: contributionPeriod\.month,\s*year: contributionPeriod\.year/.test(financeController), "Direct finance contribution creation checks the canonical monthly Contribution record");
assert(/contributionLink\.finance = transaction\._id/.test(financeController) && /await contributionLink\.save\(\)/.test(financeController), "Direct finance contribution creation links the same accounting event to Contribution");
assert(/CONTRIBUTION_ALREADY_RECORDED/.test(financeController), "Duplicate member payroll contribution events are rejected at the shared finance boundary");
assert(!/amount:\s*"500"/.test(adminFinance), "Admin payroll contribution editor does not ship a hard-coded monetary default");
assert(/summary\?\.monthlyContribution/.test(adminFinance), "Admin payroll contribution editor derives its amount from live contribution configuration");
assert(/API\.post\("\/finance"/.test(adminAccounts), "Admin Accounts keeps supported finance transaction creation wired to the backend");
assert(/API\.post\("\/finance"/.test(superAdminAccounts), "SuperAdmin Accounts keeps supported finance transaction creation wired to the backend");
assert(/paymentMethod:"Payroll"/.test(superAdminAccounts), "SuperAdmin contribution editor defaults to the only allowed contribution payment method");
assert(/type===\"contribution\"\?\"Payroll"/.test(superAdminAccounts), "SuperAdmin contribution editor forces Payroll when contribution type is selected");
assert(/type === "contribution" \? "Payroll"/.test(adminFinance), "Admin finance editor forces Payroll when contribution type is selected");
console.log("PASS cross-portal finance/contribution synchronization regression controls passed");
