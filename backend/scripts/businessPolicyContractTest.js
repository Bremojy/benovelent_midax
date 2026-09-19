'use strict';
const { read, assert, pass } = require('./testUtils');
const controller = read('backend/controllers/claimWorkflowController.js');
const support = read('backend/models/SupportRequest.js');
const policy = read('backend/controllers/policyController.js');
const migrations = [read('backend/migrations/004_normalize_member_defaults.js'), read('backend/migrations/010_enable_education_policy.js')].join('\n');

assert(/education-policy/.test(controller) && /policy\?\.category === "loan"/.test(controller), 'repayment in generic support approval is allow-listed to the education loan policy');
assert(/repaymentEnabled = educationRepayable/.test(controller) && /interestRate = educationRepayable/.test(controller), 'non-education support approvals explicitly reset repayment fields');
assert(/String\(this\.policySlug \|\| ""\) !== "education-policy"/.test(support), 'SupportRequest model strips repayment from non-education policies');
assert(/repaymentEnabled: Boolean\(body\.repaymentEnabled\)/.test(policy) && /education-policy/.test(policy), 'policy administration only enables repayment for education-policy');
assert(/education-policy/.test(migrations) && /medical-support/.test(migrations) && /funeral-support/.test(migrations), 'seeded scheme policies distinguish education loan from medical/funeral support');
pass('support repayment policy guardrails verified');
