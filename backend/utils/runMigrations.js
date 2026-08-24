const mongoose = require("mongoose");

const migrations = [
  require("../migrations/001_remove_invalid_member_nested_unique_indexes"),
  require("../migrations/002_migrate_member_occupation_to_position"),
  require("../migrations/003_seed_policies"),
  require("../migrations/004_normalize_member_defaults"),
  require("../migrations/005_align_policies_to_constitution"),
];

function normalizeMigration(migration, index) {
  if (typeof migration === "function") {
    const id = migration.id || `legacy_migration_${String(index + 1).padStart(3, "0")}`;
    return { id, run: migration };
  }

  if (!migration || typeof migration.run !== "function") {
    throw new TypeError(`Migration ${migration?.id || index + 1} must export a run() function.`);
  }

  return {
    ...migration,
    id: String(migration.id || `migration_${String(index + 1).padStart(3, "0")}`),
  };
}

async function runMigrations() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB database is not connected.");

  await db.createCollection("schema_migrations").catch((error) => {
    if (error?.codeName !== "NamespaceExists") throw error;
  });

  const collection = db.collection("schema_migrations");

  for (let index = 0; index < migrations.length; index += 1) {
    const migration = normalizeMigration(migrations[index], index);
    const exists = await collection.findOne({ _id: migration.id });
    if (exists) continue;

    try {
      await migration.run();
      await collection.insertOne({ _id: migration.id, appliedAt: new Date() });
      console.log(`[migration] Applied ${migration.id}`);
    } catch (error) {
      error.message = `[migration ${migration.id}] ${error.message}`;
      throw error;
    }
  }
}

module.exports = { runMigrations };
