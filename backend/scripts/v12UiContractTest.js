#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const packageJson = JSON.parse(read("package.json"));
const layout = read("src/layouts/DashboardLayout.jsx");
const chatSidebar = read("src/components/chat/ChatSidebar.jsx");
const messageCenter = read("src/components/chat/MessageCenterPage.jsx");
const dashboardCss = read("src/styles/v12-dashboard-mobile.css");
const sidebarCss = read("src/styles/sidebar.css");

if (packageJson.version !== "17.0.0") failures.push(`package.json: expected current release 17.0.0, found ${packageJson.version}`);
if (!layout.includes("const mobileBottomNav = isMobile;")) failures.push("DashboardLayout: persistent mobile bottom navigation contract missing.");
if (!layout.includes("showHomeBack={isMobile && !isDashboardHome}")) failures.push("DashboardLayout: mobile subpage dashboard-home navigation contract missing.");
if (!dashboardCss.includes("width: calc(100% - var(--dashboard-sidebar-width));")) failures.push("Dashboard CSS: desktop width/sidebar constraint missing.");
if (!dashboardCss.includes("--dashboard-sidebar-width: 270px;")) failures.push("Dashboard CSS: sidebar width contract missing.");
if (!sidebarCss.includes("position: fixed;")) failures.push("Sidebar CSS: fixed positioning missing.");
if (!chatSidebar.includes("currentUser,")) failures.push("ChatSidebar: current-user self filtering input missing.");
if (!chatSidebar.includes("isSameIdentity(member, actor)")) failures.push("ChatSidebar: directory self-filter missing.");
if (!chatSidebar.includes("isSameIdentity(partner, actor)")) failures.push("ChatSidebar: conversation self-filter missing.");
if (!messageCenter.includes("currentUser={currentUser || authUser}")) failures.push("MessageCenterPage: current user is not passed to chat components.");
if (!messageCenter.includes("isSameUser(person, actor)")) failures.push("MessageCenterPage: start-conversation self-check missing.");

if (failures.length) {
  console.error("V12 UI CONTRACT TEST FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("V12 UI CONTRACT TEST PASSED");
console.log("Verified current V12/V13-compatible mobile navigation, sidebar layout, and chat self-filter contracts.");
