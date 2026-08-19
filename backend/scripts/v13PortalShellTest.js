#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const menu = read("src/config/dashboardMenu.js");
const app = read("src/App.jsx");
const shell = read("src/styles/v12-dashboard-mobile.css");
const sidebar = read("src/styles/sidebar.css");

if (/Platform Center/.test(menu)) failures.push("Dashboard menus still expose the retired Platform Center.");
if (!app.includes('path="/member/platform"') || !app.includes('<Navigate to="/member" replace />')) {
  failures.push("Member legacy /platform route does not redirect to /member.");
}
if (!app.includes('path="/admin/platform"') || !app.includes('<Navigate to="/admin" replace />')) {
  failures.push("Admin legacy /platform route does not redirect to /admin.");
}
if (!app.includes('path="/superadmin/platform"') || !app.includes('<Navigate to="/superadmin" replace />')) {
  failures.push("SuperAdmin legacy /platform route does not redirect to /superadmin.");
}
if (!shell.includes("flex: 0 0 auto;")) failures.push("Dashboard main is not locked against flex overlap.");
if (!shell.includes("width: calc(100vw - var(--dashboard-sidebar-width));")) {
  failures.push("Desktop dashboard width is not calculated from the fixed sidebar.");
}
if (!shell.includes("padding-bottom: calc(var(--dashboard-bottom-nav-height) + env(safe-area-inset-bottom) + 24px)")) {
  failures.push("Mobile page content does not reserve space for the fixed bottom navigation.");
}
if (!sidebar.includes("min-height: 0;")) failures.push("Sidebar scroll area is missing min-height: 0.");
if (!sidebar.includes("margin-top: auto;")) failures.push("Sidebar footer is not anchored below the scrollable menu.");
if (!sidebar.includes("position: fixed;")) failures.push("Sidebar is not fixed to the viewport.");
if (!sidebar.includes("dashboard-sidebar.mobile-bottom-nav")) failures.push("Mobile bottom navigation hardening is missing.");

if (failures.length) {
  console.error("V13 PORTAL SHELL TEST FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("V13 PORTAL SHELL TEST PASSED");
console.log("Verified fixed desktop sidebar, non-overlapping scroll/footer layout, mobile bottom-dock spacing, and role-specific portal navigation without Platform Center.");
