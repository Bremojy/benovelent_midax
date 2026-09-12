const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const home = read("../src/pages/Home.jsx");
assert(home.includes('p.slug || ""') && home.includes('funeral-support') && home.includes('medical-support'), "Home policy cards must resolve support policies by slug.");
assert(home.includes("funeral.name || ") && home.includes("medical.name || "), "Home policy cards must use the Policy model's name field.");

const policyController = read("controllers/policyController.js");
assert(policyController.includes("payload.slug = req.body?.slug === undefined"), "Policy updates must preserve the existing slug unless explicitly changed.");

const supportController = read("controllers/supportRequestController.js");
assert(supportController.includes("Policy.findOne") && supportController.includes("policyMin") && supportController.includes("policyMax"), "Member support edits must validate the referenced policy limits.");

const supportModel = read("models/SupportRequest.js");
assert(supportModel.includes('this.isModified("requestedAmount")') && supportModel.includes('this.isModified("repaymentMonths")'), "Support repayment totals must recalculate after editable amount/term changes.");

const platform = read("controllers/platformController.js");
assert(platform.includes('select("_id name slug description category minAmount maxAmount interestRate repaymentEnabled repaymentMonths communityAssistanceEnabled applicationPath order updatedAt")'), "Assistant policy context must use actual Policy model fields.");
assert(!platform.includes("displayOrder") && !platform.includes("communityAssistance)"), "Assistant policy context must not query removed Policy fields.");

const feedback = read("controllers/feedbackController.js");
assert(feedback.includes("frequencyDays") && feedback.includes("latestResponse.submittedAt"), "Login feedback frequency must be enforced server-side.");

const migration = read("migrations/010_enable_education_policy.js");
assert(migration.includes('id: "010_enable_education_policy"') && migration.includes('enabled: true'), "Education policy migration must make the policy administratively available by default.");

for (const modelFile of ["models/EducationSupport.js", "models/MedicalSupport.js", "models/FuneralSupport.js"]) {
  const model = read(modelFile);
  assert(model.includes('refPath: "approvedByModel"') && model.includes('["Admin", "SuperAdmin"]'), `${modelFile} must preserve the correct approval actor model.`);
}

console.log("AUDIT REGRESSION TEST PASSED");
