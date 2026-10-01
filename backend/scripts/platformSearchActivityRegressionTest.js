const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const controller = fs.readFileSync(path.join(root, "controllers", "platformController.js"), "utf8");
const routes = fs.readFileSync(path.join(root, "routes", "platformRoutes.js"), "utf8");

const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => condition || fail(message);

assert(/router\.get\("\/search",\s*protect,\s*verified,\s*memberStatus,\s*profileCompleted,\s*controller\.search\)/.test(routes), "Global search must remain authenticated and member-gated.");
assert(/News\.find\(\{/.test(controller) && /published:\s*true/.test(controller), "Search must scope public news to published records.");
assert(!/const root = path\.join\(documentRoot\)/.test(controller), "Global search must not scan the private document root.");
assert(/const publicRoot = path\.join\(__dirname, "\.\.", "\.\.", "public", "documents"\)/.test(controller), "Global search must use the bundled public-document directory only.");
assert(/role === "member"/.test(controller) && /SupportRequest\.find\(\{/.test(controller), "Member search must include member-owned support requests.");
assert(/MedicalSupport\.find\(\{/.test(controller), "Member search must include medical support records.");
assert(/FuneralSupport\.find\(\{/.test(controller), "Member search must include funeral support records.");
assert(/EducationSupport\.find\(\{/.test(controller), "Member search must include education support records.");
assert(/member: memberId,/.test(controller), "Member claim searches must be scoped to the authenticated member.");
assert(/Conversation\.find\(\{ participants: memberId, lastMessageText: regex \}\)/.test(controller), "Member search must include their accessible conversation previews.");
assert(/role === "superadmin"[\s\S]*Policy\.find\(\{/.test(controller), "SuperAdmin search must include governance policies.");
assert(/role === "superadmin"[\s\S]*AuditLog\.find\(\{/.test(controller), "SuperAdmin search must include audit records.");
assert(/const auditFilter = role === "superadmin"/.test(controller), "Non-SuperAdmin activity center must not receive global audit logs.");
assert(/const conversationFilter = role === "superadmin" \? \{ _id: null \}/.test(controller), "SuperAdmin activity center must not expose chat conversations.");

console.log("PASS platform search/activity authorization and privacy contracts verified");
