const id = "006_cleanup_blank_manual_transaction_codes";

async function run() {
  const db = require("mongoose").connection.db;
  if (!db) throw new Error("MongoDB database is not connected.");

  const collection = db.collection("mpesatransactions");
  const result = await collection.updateMany(
    {
      $or: [
        { manualTransactionCode: "" },
        { manualTransactionCode: null },
      ],
    },
    { $unset: { manualTransactionCode: "" } },
  );

  if (result.modifiedCount > 0) {
    console.log(`[migration] Removed ${result.modifiedCount} blank manual M-PESA transaction codes.`);
  }
}

module.exports = { id, run };
