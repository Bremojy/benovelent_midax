const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const routes = read("backend/routes/paymentRoutes.js");
const controller = read("backend/controllers/paymentController.js");
const model = read("backend/models/MpesaTransaction.js");
const contribution = read("backend/models/Contribution.js");
const community = read("backend/models/CommunityAssistance.js");
const button = read("src/components/payments/MpesaPaymentButton.jsx");
const claims = read("src/pages/member/Claims.jsx");
const finance = read("src/pages/admin/AdminFinance.jsx");
const env = read("backend/.env.example");
const frontendEnv = read(".env.example");

for (const expected of [
  'router.post("/manual", protect, isContributionUser, controller.manualPayment);',
  'router.get("/manual/admin", protect, isAdminOrSuperAdmin, controller.manualPaymentsAdmin);',
  'router.post("/manual/:id/verify", protect, isAdminOrSuperAdmin, controller.manualVerify);',
  'router.post("/manual/:id/reject", protect, isAdminOrSuperAdmin, controller.manualReject);',
]) assert(routes.includes(expected), `Missing manual payment route: ${expected}`);
for (const expected of [
  'exports.manualPayment = async',
  'exports.manualPaymentsAdmin = async',
  'exports.manualVerify = async',
  'exports.manualReject = async',
  'manualTransactionCode',
  'reconciled = true',
  'applyContributionPayment',
  'findOneAndUpdate',
]) assert(controller.includes(expected), `Manual payment controller contract missing ${expected}`);
assert(model.includes('paymentMethod: { type: String, enum: ["stk", "manual_paybill"]'), "Payment method field missing.");
assert(model.includes('mpesaTransactionSchema.index({ manualTransactionCode: 1 }, { unique: true, sparse: true })'), "Manual transaction-code idempotency index missing.");
assert(contribution.includes('paymentTransactionIds'), "Contribution transaction-id reconciliation metadata missing.");
assert(community.includes('contributionTransactionIds'), "Community contribution transaction-id reconciliation metadata missing.");
for (const expected of ['/payments/manual', 'PayBill 247247', 'Account / Reference', 'I have paid — submit for verification']) assert(button.includes(expected), `Frontend manual payment UX missing ${expected}`);
assert(claims.includes('MpesaPaymentButton'), "Claims must use shared payment component for manual fallback.");
assert(finance.includes('/payments/manual/admin') && finance.includes('/payments/manual/') && finance.includes('Equity PayBill 247247 submissions'), "Admin manual payment verification UI missing.");
assert(env.includes('MPESA_MANUAL_PAYBILL=247247') && env.includes('MPESA_MANUAL_ACCOUNT_NUMBER=0650186528835'), "Backend manual Equity payment configuration missing.");
assert(env.includes('MPESA_B2C_ENABLED=false'), "B2C must remain disabled until officially provisioned.");
assert(frontendEnv.includes('VITE_API_URL=/api'), "Frontend must use same-origin /api proxy.");
assert(!button.includes('MPESA_CONSUMER_SECRET') && !button.includes('MPESA_PASSKEY'), "Frontend payment component must not contain Daraja secrets.");
console.log("Manual M-PESA / Equity PayBill contract test: PASS");
