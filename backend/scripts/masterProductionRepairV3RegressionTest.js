const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const assistant = read("src/components/SmartAssistant.jsx");
assert(/portalMatch/.test(assistant), "Assistant must have central portal route matching.");
assert(assistant.includes("return path === `/${role}` || path === `/${role}/`"), "Assistant must be limited to portal dashboard homes.");
assert(/\/member|admin|superadmin/.test(assistant), "Assistant portal scope should cover all three roles.");

const memberController = read("backend/controllers/memberController.js");
assert(/const memberFilter=\{role:"member",isDeleted:false\}/.test(memberController), "Community member count must use the member-role filter.");
assert(/countDocuments\(\{\.\.\.memberFilter,status:"active"\}\)/.test(memberController), "Active community count must use the canonical member filter.");

const adminController = read("backend/controllers/adminController.js");
const cacheCalls = (adminController.match(/invalidateMemberRelatedCaches\(member\._id\)/g) || []).length;
assert(cacheCalls >= 5, `Expected cache invalidation on core member mutations, found ${cacheCalls}.`);
assert(/public:community:stats/.test(adminController), "Member mutations must invalidate community stats cache.");

const notificationModel = read("backend/models/Notification.js");
assert(!/notificationSchema\.index\(\{recipient:1,read:1\}\);/.test(notificationModel), "Redundant notification index should be removed from model source.");
assert(/notificationSchema\.index\(\{recipient:1,read:1,createdAt:-1\}\);/.test(notificationModel), "Canonical unread notification index must remain.");
assert(fs.existsSync(path.join(ROOT, "backend/migrations/013_remove_redundant_notification_index.js")), "Notification index cleanup migration is required.");
const migrationRunner = read("backend/utils/runMigrations.js");
assert(migrationRunner.includes("013_remove_redundant_notification_index"), "Notification index cleanup migration must be registered with the migration runner.");

const settings = read("src/pages/superadmin/SuperAdminSettings.jsx");
assert(/validTabs = \[.*"system"/.test(settings), "System settings tab must be a valid tab.");
assert(/API\.put\("\/superadmin\/settings"/.test(settings) && /branding/.test(settings), "Theme save persists through the authoritative branding settings contract.");
assert(/settings-tab-groups/.test(settings), "SuperAdmin settings must use grouped navigation.");

const dependents = read("src/pages/member/Dependents.jsx");
assert(/dependent-request-edit/.test(dependents) && /scrollIntoView\(\{ behavior: "smooth"/.test(dependents), "Dependent Request Edit must scroll to the existing form.");
assert(/dependent-request-dependent/.test(dependents), "Dependent Request Edit should focus its selected-dependent control.");

const memberAccounts = read("src/pages/member/Accounts.jsx");
assert(!memberAccounts.includes("personalContributionTotal={summary?.totalContributed}"), "Member Constitution section must not expose personal contribution totals.");
assert(!memberAccounts.includes("contributionStatus={summary?.contributionStatus}"), "Member Constitution section must not expose personal contribution status.");
assert(memberAccounts.includes("Your ordinary contribution records"), "Personal contributions must remain in a dedicated member workflow.");

const claims = read("src/pages/admin/AdminClaims.jsx");
assert(/setSelected\(null\);/.test(claims) && /load\(\)\.catch/.test(claims), "Claim success must close immediately with best-effort refresh.");

const guide = read("src/pages/member/PortalGuide.jsx");
const adminGuide = read("src/pages/admin/AdminGuide.jsx");
assert(/Request Edit/.test(guide), "Member guide must explain controlled dependent edits.");
assert(/role-scoped|role-scoped/.test(adminGuide), "Admin guide must explain role-scoped security.");
assert(fs.existsSync(path.join(ROOT, "src/pages/admin/AdminGuide.jsx")), "Admin guide page must exist.");

const app = read("src/App.jsx");
assert(/path="\/admin\/guide"/.test(app) && /AdminGuide/.test(app), "Admin guide must have a real protected route.");

console.log("Master Production Repair V3 regression: PASS");
