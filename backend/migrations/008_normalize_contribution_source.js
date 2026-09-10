const id = "008_normalize_contribution_source";

async function run() {
  const db = require("mongoose").connection.db;
  if (!db) throw new Error("MongoDB database is not connected.");
  const contributions = db.collection("contributions");
  const finance = db.collection("finances");
  const result = await contributions.updateMany({}, { $set: { source: "payroll", paymentMethod: "Payroll" } });
  await finance.updateMany({ type: "contribution" }, { $set: { paymentMethod: "Payroll" } });
  if (result.modifiedCount) console.log(`[migration] Normalized ${result.modifiedCount} contribution records to payroll source.`);
}

module.exports = { id, run };
