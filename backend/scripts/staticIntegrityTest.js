const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const frontend = path.resolve(root, "..");
const failures = [];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "uploads"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.endsWith(".js")) out.push(full);
  }
  return out;
}

for (const file of walk(root)) {
  try { execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }); }
  catch (error) { failures.push(`Backend syntax error: ${path.relative(frontend, file)}\n${error.stderr?.toString() || error.message}`); }
}

const requiredFiles = [
  "src/components/chat/CallOverlay.jsx",
  "src/components/chat/MessageCenterPage.jsx",
  "src/components/chat/ChatSidebar.jsx",
  "src/components/chat/ChatHeader.jsx",
  "src/components/NotificationSettings.jsx",
  "public/sw.js",
  "backend/migrations/001_remove_invalid_member_nested_unique_indexes.js",
  "backend/utils/runMigrations.js",
  "backend/utils/permanentAccountDeletion.js",
];
for (const file of requiredFiles) if (!fs.existsSync(path.join(frontend, file))) failures.push(`Missing required file: ${file}`);

const memberSchema = fs.readFileSync(path.join(root, "models/Member.js"), "utf8");
const memberNextOfKin = memberSchema.slice(memberSchema.indexOf("nextOfKin:"), memberSchema.indexOf("// =====================================\n// PAYMENT DETAILS"));
if (/nextOfKin:[\s\S]*?phone:[\s\S]*?unique\s*:\s*true/.test(memberNextOfKin)) failures.push("Member.nextOfKin.phone is still uniquely indexed in the schema.");

const adminController = fs.readFileSync(path.join(root, "controllers/adminController.js"), "utf8");
if (!adminController.includes('const Admin = require("../models/Admin");')) failures.push("adminController.js is missing its Admin model import.");
if (!adminController.includes('const SuperAdmin = require("../models/SuperAdmin");')) failures.push("adminController.js is missing its SuperAdmin model import.");
if (!adminController.includes('code: "DUPLICATE_MEMBER_FIELD"')) failures.push("createMember does not translate duplicate-key errors.");

const messageSocket = fs.readFileSync(path.join(root, "sockets/messageSocket.js"), "utf8");
for (const needle of ["call-started", "missed-call", "sendPushToRecipient", "lastSeen", "portalOwnerId"]) if (!messageSocket.includes(needle)) failures.push(`Realtime call/presence check missing: ${needle}`);
const broadcastService = fs.readFileSync(path.join(root, "services/memberBroadcastService.js"), "utf8");
for (const needle of ["sendTextBeeSms", "TEXTBEE_API_KEY", "x-api-key", "api.textbee.dev"]) if (!broadcastService.includes(needle)) failures.push(`SMS integration check missing: ${needle}`);

const sw = fs.readFileSync(path.join(frontend, "public/sw.js"), "utf8");
for (const needle of ["incoming_call", "missed_call", "requireInteraction", "showNotification", "incomingPayload", "savePendingCall"]) if (!sw.includes(needle)) failures.push(`PWA push check missing: ${needle}`);

const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
if (!server.includes('require("./utils/runMigrations")')) failures.push("Server is not wired to run database migrations.");

if (failures.length) {
  console.error("\nV1 static integrity test FAILED\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("V1 static integrity test PASSED");
console.log(`Checked backend JavaScript files: ${walk(root).length}`);
console.log("Checked realtime calls, missed calls, web push, presence, migration wiring and required files.");
