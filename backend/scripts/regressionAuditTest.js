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

const apiService = read("src/services/api.js");
if (apiService.includes('String(config?.url || "")')) {
  failures.push("api service: response interceptor references undefined config instead of error.config.");
}
if (!apiService.includes("error?.config?.url") || !apiService.includes("auth/socket-ticket")) {
  failures.push("api service: Socket.IO ticket requests are not exempted from automatic auth redirects.");
}

const authContext = read("src/context/AuthContext.jsx");
if (/useCallback\(\s*async[\s\S]*?\[clearSession, user\]/m.test(authContext)) {
  failures.push("AuthContext: loadCurrentUser still depends on user and can self-trigger an authentication render loop.");
}
if (!authContext.includes("if (!getStoredUser()) setLoading(true);")) {
  failures.push("AuthContext: session verification should use stored-session presence rather than reactive user state for its loading decision.");
}

if (failures.length) {
  console.error("REGRESSION AUDIT FAILED");
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log("REGRESSION AUDIT PASSED");
