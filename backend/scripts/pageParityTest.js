const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const app = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");
const menu = fs.readFileSync(path.join(root, "src/config/dashboardMenu.js"), "utf8");

const errors = [];
const routePaths = new Set([...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]));
const requiredPortalPaths = [...menu.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);

for (const route of requiredPortalPaths) {
  if (!routePaths.has(route)) errors.push(`Missing route for dashboard menu item: ${route}`);
}

const expectedFiles = [
  "src/pages/Home.jsx","src/pages/About.jsx","src/pages/Services.jsx","src/pages/Leaders.jsx",
  "src/pages/Constitution.jsx","src/pages/Gallery.jsx","src/pages/News.jsx","src/pages/Contact.jsx","src/pages/Login.jsx",
  "src/pages/member/MemberDashboard.jsx","src/pages/member/Profile.jsx","src/pages/member/Contributions.jsx",
  "src/pages/member/Claims.jsx","src/pages/member/Support.jsx","src/pages/member/Dependents.jsx","src/pages/member/Settings.jsx",
  "src/pages/admin/AdminDashboard.jsx","src/pages/admin/AdminMembers.jsx","src/pages/admin/AdminFinance.jsx",
  "src/pages/admin/AdminClaims.jsx","src/pages/admin/AdminSupport.jsx","src/pages/admin/AdminMessages.jsx",
  "src/pages/superadmin/SuperAdminDashboard.jsx","src/pages/superadmin/SuperAdminAdmins.jsx","src/pages/superadmin/SuperAdminAudit.jsx",
  "src/pages/superadmin/SuperAdminPolicies.jsx","src/pages/superadmin/SuperAdminSettings.jsx","src/pages/superadmin/SuperAdminSystem.jsx",
  "src/pages/superadmin/SuperAdminDataIntegrity.jsx",
];
for (const file of expectedFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing page component: ${file}`);
}

// Detect literal duplicate declarations of a route in App.jsx.
const routeCounts = {};
for (const m of app.matchAll(/path="([^"]+)"/g)) routeCounts[m[1]] = (routeCounts[m[1]] || 0) + 1;
for (const [route, count] of Object.entries(routeCounts)) {
  if (route !== "*" && count > 1) errors.push(`Duplicate route declaration: ${route}`);
}

if (errors.length) {
  console.error("PAGE PARITY TEST FAILED");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("PAGE PARITY TEST PASSED");
console.log(`Verified ${requiredPortalPaths.length} dashboard navigation entries and ${expectedFiles.length} critical page components.`);
