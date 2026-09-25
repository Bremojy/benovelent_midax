const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const fail = (msg) => { throw new Error(msg); };

const notification = read("src/components/member/NotificationCenter.jsx");
const mpesa = read("src/components/payments/MpesaPaymentButton.jsx");

if (/API\.get\("\/notifications"[\s\S]*catch\s*\{\s*\}/.test(notification)) {
  fail("NotificationCenter must not silently swallow notification load failures.");
}
if (!notification.includes('setLoadError(message)') || !notification.includes('role="alert"')) {
  fail("NotificationCenter must expose notification load failures to the user.");
}
if (/catch\s*\{\s*\}\s*\n\s*\}\s*if \(attempts >= 30/.test(mpesa)) {
  fail("M-PESA status polling must not silently swallow status refresh failures.");
}
if (!mpesa.includes("M-PESA STK status query error:") || !mpesa.includes("M-PESA transaction polling error:")) {
  fail("M-PESA status polling must log and surface refresh failures.");
}

console.log("PASS user-facing notification and M-PESA error handling no longer silently hides API failures");
