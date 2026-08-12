const Member = require("../models/Member");

async function run() {
  const indexes = await Member.collection.indexes();
  const invalid = indexes.filter((index) => index.name === "nextOfKin.phone_1" || index.key?.["nextOfKin.phone"] === 1);
  for (const index of invalid) {
    try {
      await Member.collection.dropIndex(index.name);
      console.log(`[migration] Dropped invalid Member index: ${index.name}`);
    } catch (error) {
      if (!/not found|index not found/i.test(error.message || "")) throw error;
    }
  }
}

module.exports = { id: "001_remove_invalid_member_nested_unique_indexes", run };
