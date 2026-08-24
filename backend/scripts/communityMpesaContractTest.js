const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const paymentRoutes = read("backend/routes/paymentRoutes.js");
const paymentController = read("backend/controllers/paymentController.js");
const adminClaims = read("src/pages/admin/AdminClaims.jsx");
const memberClaims = read("src/pages/member/Claims.jsx");

for (const value of ["/community-assistance", "/community-assistance/:id/payout", "community_assistance", "enableCommunityAssistance", "payoutCommunity"]) {
  if (!paymentRoutes.includes(value) && !paymentController.includes(value)) throw new Error(`Missing M-PESA community route/handler: ${value}`);
}
for (const value of ["Enable community M-PESA", "/payments/community-assistance", "Publish to News", "Disburse raised funds"]) {
  if (!adminClaims.includes(value)) throw new Error(`Admin claims page missing: ${value}`);
}
for (const value of ["/payments/community-assistance", "Contribute via M-PESA", "COMMUNITY M-PESA OPPORTUNITIES"]) {
  if (!memberClaims.includes(value)) throw new Error(`Member claims page missing: ${value}`);
}
console.log("Community M-PESA contract test: PASS");
