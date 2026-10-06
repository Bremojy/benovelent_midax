const mongoose = require("mongoose");

const id = "016_link_claim_legacy_payment_references";
const sourceMap = {
  medicalsupports: "MedicalSupport",
  funeralsupports: "FuneralSupport",
  educationsupports: "EducationSupport",
  supportrequests: "SupportRequest",
};

async function run() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB database is not connected.");
  const finance = db.collection("finances");
  let linked = 0;

  for (const [collectionName, sourceModel] of Object.entries(sourceMap)) {
    const collection = db.collection(collectionName);
    const cursor = collection.find({
      paymentReference: { $exists: true, $nin: ["", null] },
      settlementTransactionId: { $in: [null] },
    });

    for await (const row of cursor) {
      const reference = String(row.paymentReference || "").trim();
      if (!reference) continue;
      const matches = await finance.find({
        type: "claim",
        member: row.member,
        $or: [{ referenceNumber: reference }, { receiptNumber: reference }],
      }).limit(2).toArray();

      if (matches.length === 1) {
        await collection.updateOne(
          { _id: row._id },
          {
            $set: { settlementTransactionId: matches[0]._id, settlementTransactionModel: "Finance" },
            $unset: { paymentReference: "" },
          }
        );
        linked += 1;
      }
    }
  }

  const repaymentCleanup = await db.collection("educationsupports").updateMany(
    { "repayments.reference": { $exists: true } },
    { $unset: { "repayments.$[].reference": "" } }
  );
  if (repaymentCleanup.modifiedCount) {
    console.log(`[migration] ${id}: removed obsolete education repayment reference fields from ${repaymentCleanup.modifiedCount} document(s); canonical M-PESA transaction IDs remain.`);
  }

  console.log(`[migration] ${id}: linked ${linked} claim payment evidence record(s) to unique Finance settlements; ambiguous/unmatched legacy references were retained for audit safety.`);
}

module.exports = { id, run };
