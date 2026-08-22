const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const admin = read("backend/controllers/adminController.js");
const integrity = read("backend/controllers/dataIntegrityController.js");
const memberNumber = read("backend/utils/memberNumber.js");
const integrityRoute = read("backend/routes/dataIntegrityRoutes.js");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(memberNumber.includes('const memberNumber = `BM${String(number).padStart(3, "0")}`'), "Member numbers must be generated as BM###.");
expect(memberNumber.includes("aggregation-pipeline update") || memberNumber.includes("$ifNull"), "Member number allocation must avoid conflicting $max/$inc updates on seq.");
expect(!memberNumber.includes("{ $max: { seq: floor }, $inc: { seq: 1 } }"), "Member sequence allocator must not combine conflicting updates to seq.");

expect(admin.includes("const cleanMemberNumber = await generateMemberNumber();"), "Member creation must generate the member number server-side.");
expect(!admin.includes("const requestedMemberNumber = normalizeLegacyMemberNumber(req.body?.memberNumber);"), "Member creation must not depend on the old employee-number input.");
expect(admin.includes("let member = await Member.findOne({ _id: req.params.id, role: \"member\", isDeleted: false });"), "Verification must permit replacing a legacy member number before saving.");
expect(integrity.includes('Member.find({}).select("fullName name email username memberNumber phone status role isDeleted portalOwnerId portalOwnerRole'), "Integrity scan must inspect the raw Member collection.");
expect(integrity.includes('String(record.role || "member").toLowerCase() === "member" && record.isDeleted !== true'), "Integrity member counts must restrict live members to role=member.");
expect(integrity.includes("legacyPortalProfiles"), "Integrity report must distinguish legacy portal chat profiles from real members.");
expect(integrity.includes("invalidMemberNumbers"), "Integrity report must identify invalid or legacy member numbers.");
expect(integrityRoute.includes('router.get("/members-reconciliation", getMemberReconciliation);'), "A live member reconciliation endpoint must exist.");

if (failures.length) {
  console.error("MEMBER DATABASE CONTRACT TEST FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("MEMBER DATABASE CONTRACT TEST PASSED");
