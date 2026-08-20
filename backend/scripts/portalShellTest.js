#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const app = read("src/App.jsx");
const layout = read("src/layouts/DashboardLayout.jsx");
const shell = read("src/styles/dashboard-mobile.css");
const dashboard = read("src/styles/dashboard.css");
const sidebar = read("src/styles/sidebar.css");
const sidebarComponent = read("src/components/dashboard/DashboardSidebar.jsx");
const menu = read("src/config/dashboardMenu.js");

if (/Platform Center/.test(menu)) failures.push("Dashboard menus still expose the retired Platform Center.");
if (!app.includes('path="/member/platform"') || !app.includes('<Navigate to="/member" replace />')) failures.push("Member legacy /platform route does not redirect to /member.");
if (!app.includes('path="/admin/platform"') || !app.includes('<Navigate to="/admin" replace />')) failures.push("Admin legacy /platform route does not redirect to /admin.");
if (!app.includes('path="/superadmin/platform"') || !app.includes('<Navigate to="/superadmin" replace />')) failures.push("SuperAdmin legacy /platform route does not redirect to /superadmin.");

if (!layout.includes("const mobileBottomNav = isMobile;")) failures.push("Every mobile portal page must receive the fixed bottom dock.");
if (!layout.includes('showHomeBack={isMobile && !isDashboardHome}')) failures.push("Mobile subpages do not retain a direct Dashboard return action.");
if (!layout.includes("dashboard-mobile-shell")) failures.push("Mobile portal shell marker is missing.");
if (!layout.includes("dashboard-is-subpage")) failures.push("Portal subpage marker is missing.");

if (!dashboard.includes("--dashboard-sidebar-width: 270px;")) failures.push("Desktop sidebar width contract is missing.");
if (!dashboard.includes("width: calc(100% - var(--dashboard-sidebar-width));")) failures.push("Desktop dashboard width is not constrained beside the fixed sidebar.");
if (dashboard.includes("max-height: calc(100dvh - 72px)")) failures.push("Dashboard content still uses the old locked viewport height that caused scrolling problems.");
if (!dashboard.includes("overflow: visible;")) failures.push("Portal content must use normal document scrolling.");
if (dashboard.includes("position: fixed") && dashboard.includes("dashboard-portal-footer")) failures.push("Portal footer must not be viewport-fixed over portal content.");

if (!sidebar.includes("position: fixed;")) failures.push("Desktop sidebar is not fixed to the viewport.");
if (!sidebar.includes("dashboard-sidebar.mobile-bottom-nav")) failures.push("Mobile bottom dock is missing.");
if (!sidebar.includes("bottom: 0;")) failures.push("Mobile bottom dock is not anchored to the viewport bottom.");
if (!sidebar.includes("background: rgba(255, 255, 255, .98);")) failures.push("Mobile dock visual hierarchy is not using the intended light thumb-friendly surface.");
if (!sidebar.includes("height: 58px;")) failures.push("Mobile dock actions are not thumb-friendly enough.");
if (!sidebarComponent.includes('className="dashboard-sidebar mobile-bottom-nav"')) failures.push("Mobile dock component is missing.");
if (!sidebarComponent.includes('className="dashboard-sidebar mobile-drawer open"')) failures.push("Mobile full navigation drawer is missing.");
if (sidebarComponent.includes('mobile-drawer`} aria-label="Dashboard navigation"')) failures.push("Desktop sidebar must not carry the mobile-drawer class.");

if (failures.length) {
  console.error("PORTAL SHELL TEST FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("PORTAL SHELL TEST PASSED");
console.log("Verified fixed desktop sidebar, persistent fixed mobile bottom dock on portal subpages, normal document scrolling, non-overlapping footer, mobile drawer separation, and role-specific portal navigation.");
