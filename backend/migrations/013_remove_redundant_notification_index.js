const mongoose = require("mongoose");

/**
 * Drop the redundant { recipient, read } notification index.
 * The authoritative unread-query index also includes createdAt and remains in the schema:
 * { recipient: 1, read: 1, createdAt: -1 }.
 *
 * Safe to run repeatedly: missing indexes are ignored.
 */
module.exports = async function removeRedundantNotificationIndex({ db = mongoose.connection.db } = {}) {
  if (!db) throw new Error("MongoDB connection is required for notification index migration.");
  const collection = db.collection("notifications");
  const indexes = await collection.indexes();
  const redundant = indexes.find((index) => {
    const keys = index?.key || {};
    return index.name !== "_id_" &&
      keys.recipient === 1 &&
      keys.read === 1 &&
      Object.keys(keys).length === 2;
  });
  if (redundant?.name) await collection.dropIndex(redundant.name);
  return { dropped: redundant?.name || null };
};
