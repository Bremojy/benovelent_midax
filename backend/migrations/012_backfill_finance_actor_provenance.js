const mongoose = require("mongoose");

const id = "012_backfill_finance_actor_provenance";

async function run() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB database is not connected.");

  const finance = db.collection("finances");
  const admins = db.collection("admins");
  const superadmins = db.collection("superadmins");

  const cursor = finance.find({
    transactedBy: { $exists: true, $ne: null },
    $or: [
      { transactedByModel: { $exists: false } },
      { transactedByModel: null },
      { transactedByName: { $exists: false } },
      { transactedByName: null },
      { transactedByName: "" },
    ],
  }).project({ _id: 1, transactedBy: 1, transactedByModel: 1, transactedByName: 1 });

  let updated = 0;
  for await (const row of cursor) {
    const actorId = row.transactedBy;
    const [admin, superadmin] = await Promise.all([
      admins.findOne({ _id: actorId }, { projection: { fullName: 1, name: 1 } }),
      superadmins.findOne({ _id: actorId }, { projection: { fullName: 1, name: 1 } }),
    ]);

    // Only backfill when the existing actor reference resolves to exactly one
    // authoritative actor collection. Never infer from an approval identity.
    if ((admin && superadmin) || (!admin && !superadmin)) continue;

    const resolvedModel = admin ? "Admin" : "SuperAdmin";
    const resolvedName = (admin || superadmin)?.fullName || (admin || superadmin)?.name || "";
    const set = {
      transactedByModel: resolvedModel,
      ...(resolvedName ? { transactedByName: resolvedName } : {}),
    };

    await finance.updateOne({ _id: row._id }, { $set: set });
    updated += 1;
  }

  if (updated) console.log(`[migration] Backfilled actor provenance for ${updated} Finance record(s) using existing transactedBy references only.`);
}

module.exports = { id, run };
