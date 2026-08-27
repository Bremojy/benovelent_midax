#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const layout = read("src/layouts/DashboardLayout.jsx");
const sidebar = read("src/components/dashboard/DashboardSidebar.jsx");
const chatSidebar = read("src/components/chat/ChatSidebar.jsx");
const messageCenter = read("src/components/chat/MessageCenterPage.jsx");
const dashboardCss = read("src/styles/dashboard.css");
const mobileCss = read("src/styles/dashboard-mobile.css");
const sidebarCss = read("src/styles/sidebar.css");
const packageJson = JSON.parse(read("package.json"));

if (packageJson.version !== "18.5.0") failures.push(`package.json: expected current release version, found ${packageJson.version}`);
if (!layout.includes("const mobileBottomNav = isMobile;")) failures.push("DashboardLayout: mobile bottom navigation is not persistent across portal pages.");
if (!layout.includes("showHomeBack={isMobile && !isDashboardHome}")) failures.push("DashboardLayout: mobile portal subpages do not expose dashboard-home navigation.");
if (!layout.includes("dashboard-mobile-shell")) failures.push("DashboardLayout: mobile shell class is missing.");
if (!dashboardCss.includes("--dashboard-sidebar-width: 270px;")) failures.push("Dashboard CSS: sidebar width contract is missing.");
if (!dashboardCss.includes("width: calc(100% - var(--dashboard-sidebar-width));")) failures.push("Dashboard CSS: desktop content width is not constrained to the sidebar.");
if (dashboardCss.includes("max-height: calc(100dvh - 72px)")) failures.push("Dashboard CSS: legacy fixed content height is still present.");
if (!dashboardCss.includes("padding-bottom: calc(var(--dashboard-bottom-nav-height) + env(safe-area-inset-bottom) + 24px)")) failures.push("Dashboard mobile spacing must account for the fixed bottom dock and safe-area inset.");
if (!sidebarCss.includes("position: fixed;")) failures.push("Sidebar CSS: fixed positioning is missing.");
if (!sidebarCss.includes("bottom: 0;")) failures.push("Sidebar CSS: mobile dock is not fixed to the bottom edge.");
if (!sidebarCss.includes("height: 58px;")) failures.push("Sidebar CSS: mobile actions are not thumb-friendly.");
if (sidebar.includes("className=\"dashboard-sidebar mobile-drawer\"")) failures.push("Sidebar component: the desktop persistent sidebar must remain independent of mobile drawer styling.");

if (!chatSidebar.includes("currentUser,")) failures.push("ChatSidebar: current user identity is not supplied for self-filtering.");
if (!chatSidebar.includes("isSameIdentity(member, actor)")) failures.push("ChatSidebar: member directory self-filter is missing.");
if (!chatSidebar.includes("isSameIdentity(partner, actor)")) failures.push("ChatSidebar: conversation self-filter is missing.");
if (!chatSidebar.includes("isExactActorId(partner, actor)")) failures.push("ChatSidebar: canonical-id conversation self-filter is missing.");
if (!messageCenter.includes("currentUser={currentUser || authUser}")) failures.push("MessageCenterPage: current user is not passed to ChatSidebar.");
if (!messageCenter.includes("isSameUser(person, actor)")) failures.push("MessageCenterPage: start-conversation self-check is missing.");

if (failures.length) {
  console.error("PORTAL UI CONTRACT TEST FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("PORTAL UI CONTRACT TEST PASSED");
console.log("Verified persistent mobile navigation, fixed desktop sidebar, thumb-friendly mobile actions, scroll-safe shell spacing, portal navigation to home, and chat self-filter contracts.");
