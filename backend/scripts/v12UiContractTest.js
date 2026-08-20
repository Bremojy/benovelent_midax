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
const dashboardCss = read("src/styles/v12-dashboard-mobile.css");
const packageJson = JSON.parse(read("package.json"));

if (packageJson.version !== "12.0.0") failures.push(`package.json: expected V12 version 12.0.0, found ${packageJson.version}`);
if (!layout.includes("const mobileBottomNav = isMobile && isDashboardHome;")) failures.push("DashboardLayout: mobile bottom navigation is not limited to the portal dashboard home.");
if (!layout.includes("showHomeBack={isMobile && mobileSubpage}")) failures.push("DashboardLayout: mobile portal subpages do not expose dashboard-home navigation.");
if (!dashboardCss.includes("width: calc(100% - var(--dashboard-sidebar-width));")) failures.push("Dashboard CSS: desktop content width is not constrained to the sidebar.");
if (!dashboardCss.includes("--dashboard-sidebar-width: 270px;")) failures.push("Dashboard CSS: sidebar width contract missing.");
if (!chatSidebar.includes("currentUser,")) failures.push("ChatSidebar: current user identity is not supplied for self-filtering.");
if (!chatSidebar.includes("isSameIdentity(member, actor)")) failures.push("ChatSidebar: member directory self-filter is missing.");
if (!chatSidebar.includes("isSameIdentity(conversation.partner || {}, actor)")) failures.push("ChatSidebar: conversation self-filter is missing.");
if (!messageCenter.includes("currentUser={currentUser || authUser}")) failures.push("MessageCenterPage: current user is not passed to ChatSidebar.");
if (!messageCenter.includes("isSameUser(person, actor)")) failures.push("MessageCenterPage: start-conversation self-check is missing.");

if (failures.length) {
  console.error("V12 UI CONTRACT TEST FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("V12 UI CONTRACT TEST PASSED");
console.log("Verified dashboard-home mobile navigation, dashboard/sidebar width constraints, portal navigation to home, and chat self-filter contracts.");
