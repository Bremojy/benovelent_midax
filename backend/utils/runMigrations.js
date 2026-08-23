const mongoose = require("mongoose");

const migrations = [
  require("../migrations/001_remove_invalid_member_nested_unique_indexes"),
  require("../migrations/002_migrate_member_occupation_to_position"),
  require("../migrations/003_seed_policies"),
  require("../migrations/004_normalize_member_defaults"),
];

async function runMigrations() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB database is not connected.");

  await db.createCollection("schema_migrations").catch((error) => {
    if (error?.codeName !== "NamespaceExists") throw error;
  });
  const collection = db.collection("schema_migrations");

  for (const migration of migrations) {
    const exists = await collection.findOne({ _id: migration.id });
    if (exists) continue;
    await migration.run();
    await collection.insertOne({ _id: migration.id, appliedAt: new Date() });
    console.log(`[migration] Applied ${migration.id}`);
  }
}

module.exports = { runMigrations };
