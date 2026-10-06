const mongoose = require("mongoose");

const id = "015_backfill_claim_actor_provenance";
const actors = [
  { name: "Member", collection: "members" },
  { name: "Admin", collection: "admins" },
  { name: "SuperAdmin", collection: "superadmins" },
];
const claimCollections = ["medicalsupports", "funeralsupports", "educationsupports", "supportrequests"];

async function resolveModel(db, idValue, allowed) {
  const hits = [];
  for (const model of allowed) {
    if (await db.collection(model.collection).findOne({ _id: idValue }, { projection: { _id: 1 } })) hits.push(model.name);
  }
  return hits.length === 1 ? hits[0] : null;
}

async function run() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB database is not connected.");
  let changed = 0;

  for (const collectionName of claimCollections) {
    const collection = db.collection(collectionName);
    for await (const row of collection.find({})) {
      const set = {};
      const actorRules = [
        ["createdBy", actors],
        ["processedBy", [actors[1], actors[2]]],
        ["updatedBy", actors],
        ["approvedBy", [actors[1], actors[2]]],
        ["hiddenBy", actors],
        ["deletedBy", actors],
        ["publishedBy", [actors[1], actors[2]]],
      ];

      for (const [field, allowed] of actorRules) {
        const value = row[field];
        if (!value || row[`${field}Model`]) continue;
        const model = await resolveModel(db, value, allowed);
        if (model) set[`${field}Model`] = model;
      }

      let timelineChanged = false;
      const timeline = [];
      for (const entry of Array.isArray(row.timeline) ? row.timeline : []) {
        const next = { ...entry };
        if (next.updatedBy && !next.updatedByModel) {
          const model = await resolveModel(db, next.updatedBy, actors);
          if (model) {
            next.updatedByModel = model;
            timelineChanged = true;
          }
        }
        timeline.push(next);
      }

      const update = {};
      if (Object.keys(set).length) update.$set = set;
      if (timelineChanged) update.$set = { ...(update.$set || {}), timeline };
      if (Object.keys(update).length) {
        await collection.updateOne({ _id: row._id }, update);
        changed += 1;
      }
    }
  }

  console.log(`[migration] ${id}: backfilled provenance on ${changed} claim document(s) where actor IDs resolved uniquely.`);
}

module.exports = { id, run };
