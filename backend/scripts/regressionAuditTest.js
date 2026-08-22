const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const failures = [];
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const platform = read("backend/controllers/platformController.js");
if (!platform.includes('const WebsiteContent = require("../models/WebsiteContent");')) {
  failures.push("platformController: WebsiteContent model import is missing.");
}

const memberDashboard = read("src/pages/member/MemberDashboard.jsx");
if (memberDashboard.includes('localStorage.getItem("memberToken")')) {
  failures.push("MemberDashboard: still hardcodes memberToken.");
}
if (!memberDashboard.includes('to="/member/messages"') && !memberDashboard.includes("/member/messages")) {
  failures.push("MemberDashboard: canonical Messages navigation is missing.");
}
if (!memberDashboard.includes('unreadMessages')) {
  failures.push("MemberDashboard: unread message indicator contract is missing.");
}

const assistant = read("src/components/SmartAssistant.jsx");
if (assistant.includes('const STORAGE_KEY = "benovelentMidaxAssistantHistory";')) {
  failures.push("SmartAssistant: assistant history still uses one global storage key.");
}
if (!assistant.includes("getHistoryKey")) {
  failures.push("SmartAssistant: role/section history isolation is missing.");
}

if (failures.length) {
  console.error("REGRESSION AUDIT FAILED");
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log("REGRESSION AUDIT PASSED");
