const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..", "..");
const menuSource = fs.readFileSync(path.join(root, "src/config/dashboardMenu.js"), "utf8");
const appSource = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");
const mapPath = path.join(root, "docs", "PORTAL_DATA_MAP.md");

const menuEntries = [...menuSource.matchAll(/section:\s*"([^"]+)",\s*title:\s*"([^"]+)",[^]*?path:\s*"([^"]+)"/g)]
  .map(([, section, title, route]) => ({ section, title, route }));

const expectedRoutes = [
  "/member","/member/account","/member/money","/member/support-center","/member/community","/member/help","/member/settings",
  "/admin","/admin/operations","/admin/finance-center","/admin/communications","/admin/website","/admin/reports","/admin/leadership","/admin/settings",
  "/superadmin","/superadmin/people","/superadmin/governance","/superadmin/finance-center","/superadmin/communications","/superadmin/system-center","/superadmin/settings-center"
];

const appRoutes = new Set([...appSource.matchAll(/path="([^"]+)"/g)].map(([, route]) => route));
const failures = [];
if (!fs.existsSync(mapPath)) failures.push("Missing docs/PORTAL_DATA_MAP.md.");
if (menuEntries.length !== expectedRoutes.length) failures.push(`Expected ${expectedRoutes.length} grouped menu entries, found ${menuEntries.length}.`);
for (const route of expectedRoutes) if (!appRoutes.has(route)) failures.push(`Expected portal route missing from App.jsx: ${route}`);
for (const entry of menuEntries) {
  if (!entry.section) failures.push(`Portal menu entry has no section: ${entry.title} (${entry.route})`);
  if (!appRoutes.has(entry.route)) failures.push(`Menu route missing from App.jsx: ${entry.route}`);
}
const duplicates = menuEntries.map(x => x.route).filter((r,i,a) => a.indexOf(r) !== i);
if (duplicates.length) failures.push(`Duplicate menu route(s): ${[...new Set(duplicates)].join(", ")}`);
if (failures.length) {
  console.error("PORTAL PAGE DATA MAP TEST FAILED");
  failures.forEach(x => console.error(`- ${x}`));
  process.exit(1);
}
console.log("PORTAL PAGE DATA MAP TEST PASSED");
console.log(`Verified ${menuEntries.length} grouped navigation entries, ${expectedRoutes.length} protected portal destinations, and the generated data map.`);
