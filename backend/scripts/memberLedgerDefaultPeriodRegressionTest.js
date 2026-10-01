const fs = require("fs");

const controller = fs.readFileSync("backend/controllers/financeController.js", "utf8");
const memberAccounts = fs.readFileSync("src/pages/member/Accounts.jsx", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  !controller.includes('if ((startDate && !endDate) || (!startDate && endDate))'),
  "ledger endpoint no longer rejects a partial range before the authoritative service validates/defaults it"
);
assert(
  controller.includes('startDate: startDate || undefined') && controller.includes('endDate: endDate || undefined'),
  "ledger endpoint must pass blank dates through so the authoritative service can apply safe defaults"
);
assert(
  controller.includes('memberId: role === "member" ? req.user._id : null'),
  "member ledger must remain scoped to the authenticated member"
);
assert(
  memberAccounts.includes('loadConstitution({ start: yearStart, end: today });'),
  "member Accounts must load its safe default ledger period automatically"
);

console.log("PASS member ledger default-period contract verified");
