const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const model = read("backend/models/MpesaTransaction.js");
const migration = read("backend/migrations/006_cleanup_blank_manual_transaction_codes.js");
const controller = read("backend/controllers/paymentController.js");
const migrations = read("backend/utils/runMigrations.js");

assert(model.includes('manualTransactionCode: { type: String, default: undefined, trim: true, uppercase: true }'), "Blank manual transaction codes must not be persisted by default.");
assert(model.includes('mpesaTransactionSchema.index({ manualTransactionCode: 1 }, { unique: true, sparse: true })'), "Manual transaction-code unique sparse index is missing.");
assert(migration.includes('{ manualTransactionCode: "" }') && migration.includes('{ manualTransactionCode: null }'), "Migration must remove legacy blank/null manual transaction codes.");
assert(migrations.includes('006_cleanup_blank_manual_transaction_codes'), "Blank manual transaction-code migration is not registered.");
const stkCreate = controller.match(/tx = await MpesaTransaction\.create\(\{([\s\S]*?)\n    }\);/);
assert(stkCreate && !stkCreate[1].includes('manualTransactionCode'), "STK transaction creation must not supply manualTransactionCode.");
console.log("M-PESA manual transaction index regression test: PASS");
