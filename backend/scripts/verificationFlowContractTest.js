#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const member = read("backend/controllers/memberController.js");
const admin = read("backend/controllers/adminController.js");
const routes = read("backend/routes/adminRoutes.js");
const middleware = read("backend/middleware/verifiedMiddleware.js");
const dashboard = read("src/pages/member/MemberDashboard.jsx");
const page = read("src/pages/admin/AdminMembers.jsx");
const service = read("src/services/adminService.js");

for (const needle of ["Verification pending", "Member verification required", "verificationRequestedAt", "calculateProfileCompletion(member).percentage === 100"]) {
  if (!member.includes(needle)) failures.push(`Member verification request missing: ${needle}`);
}
for (const needle of ["exports.verifyMember", "profileVerified = true", "member.verified = true", "PROFILE_INCOMPLETE", "You can now add dependents and submit support requests"]) {
  if (!admin.includes(needle)) failures.push(`Admin verification action missing: ${needle}`);
}
for (const needle of ['"/members/:id/verify"', "isAdminOrSuperAdmin", "verifyMember"]) {
  if (!routes.includes(needle)) failures.push(`Verification route missing: ${needle}`);
}
for (const needle of ["if (!req.user.verified)", "MEMBER_NOT_VERIFIED"]) {
  if (!middleware.includes(needle)) failures.push(`Verified-member guard missing: ${needle}`);
}
for (const needle of ["VERIFICATION PENDING", "member.verified", "Dependents and support requests will unlock after verification"]) {
  if (!dashboard.includes(needle)) failures.push(`Member dashboard verification state missing: ${needle}`);
}
for (const needle of ["verifyAdminMember", "/admin/members/${memberId}/verify", "Verify Member"]) {
  if (!service.includes(needle) && !page.includes(needle)) failures.push(`Admin verification UI/service missing: ${needle}`);
}

if (failures.length) {
  console.error("VERIFICATION FLOW CONTRACT TEST FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("VERIFICATION FLOW CONTRACT TEST PASSED");
