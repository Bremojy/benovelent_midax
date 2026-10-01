const fs = require("fs");

const controller = fs.readFileSync("backend/controllers/financeController.js", "utf8");
const memberAccounts = fs.readFileSync("src/pages/member/Accounts.jsx", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  controller.includes('if ((startDate && !endDate) || (!startDate && endDate))'),
  "ledger endpoint must reject only-partial date ranges"
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
assert(
  memberAccounts.includes('if (nextStart) params.startDate = nextStart;') &&
  memberAccounts.includes('if (nextEnd) params.endDate = nextEnd;') &&
  !memberAccounts.includes('setError("Select both a start date and end date first.")'),
  "member Accounts must allow the no-date default ledger request instead of blocking it in the UI"
);

console.log("PASS member ledger default-period contract verified");
