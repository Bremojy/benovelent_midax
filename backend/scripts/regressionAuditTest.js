const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const failures = [];
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const platform = read("backend/controllers/platformController.js");
if (!platform.includes('const WebsiteContent = require("../models/WebsiteContent");')) {
  failures.push("platformController: WebsiteContent model import is missing.");
}

const chatPreview = read("src/components/dashboard/ChatPreview.jsx");
if (chatPreview.includes('localStorage.getItem("memberToken")')) {
  failures.push("ChatPreview: still hardcodes memberToken.");
}
if (!chatPreview.includes('API.get("/conversations")')) {
  failures.push("ChatPreview: shared authenticated API call is missing.");
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
