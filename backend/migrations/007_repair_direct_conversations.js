const mongoose = require("mongoose");

const id = "007_repair_direct_conversations";

function key(ids) {
  return [...new Set(ids.map(String))].sort().join(":");
}

function union(a = [], b = []) {
  return [...new Set([...a, ...b].map(String))].filter(Boolean).map((value) => new mongoose.Types.ObjectId(value));
}

async function run() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB database is not connected.");
  const conversations = db.collection("conversations");
  const messages = db.collection("messages");

  const cursor = conversations.find({ isGroup: { $ne: true }, $expr: { $eq: [{ $size: "$participants" }, 2] } }).sort({ updatedAt: -1, _id: -1 });
  const groups = new Map();
  for await (const conversation of cursor) {
    if (!Array.isArray(conversation.participants) || conversation.participants.length !== 2) continue;
    const directKey = key(conversation.participants);
    if (!groups.has(directKey)) groups.set(directKey, []);
    groups.get(directKey).push(conversation);
  }

  for (const [directKey, rows] of groups.entries()) {
    const survivor = rows[0];
    const update = {
      $set: { directKey },
    };
    const merged = {
      deletedFor: survivor.deletedFor || [],
      archivedBy: survivor.archivedBy || [],
      mutedBy: survivor.mutedBy || [],
      pinnedBy: survivor.pinnedBy || [],
    };
    let latestMessage = survivor.lastMessageTime ? new Date(survivor.lastMessageTime) : new Date(0);

    for (const duplicate of rows.slice(1)) {
      await messages.updateMany({ conversation: duplicate._id }, { $set: { conversation: survivor._id } });
      for (const field of Object.keys(merged)) merged[field] = union(merged[field], duplicate[field] || []);
      const candidateTime = duplicate.lastMessageTime ? new Date(duplicate.lastMessageTime) : new Date(0);
      if (candidateTime > latestMessage) {
        latestMessage = candidateTime;
        update.$set.lastMessage = duplicate.lastMessage || null;
        update.$set.lastMessageText = duplicate.lastMessageText || "";
        update.$set.lastMessageSender = duplicate.lastMessageSender || null;
        update.$set.lastMessageTime = duplicate.lastMessageTime || null;
      }
      if (duplicate.unreadCounts) {
        update.$set.unreadCounts = { ...(update.$set.unreadCounts || survivor.unreadCounts || {}) };
        for (const [actor, count] of Object.entries(duplicate.unreadCounts)) {
          update.$set.unreadCounts[actor] = Math.max(Number(update.$set.unreadCounts[actor] || 0), Number(count || 0));
        }
      }
      await conversations.deleteOne({ _id: duplicate._id });
    }

    update.$set.deletedFor = merged.deletedFor;
    update.$set.archivedBy = merged.archivedBy;
    update.$set.mutedBy = merged.mutedBy;
    update.$set.pinnedBy = merged.pinnedBy;
    await conversations.updateOne({ _id: survivor._id }, update);
  }

  await conversations.updateMany(
    { isGroup: { $ne: true }, $or: [{ directKey: "" }, { directKey: null }] },
    { $unset: { directKey: "" } },
  );

  await conversations.createIndex(
    { directKey: 1 },
    { unique: true, partialFilterExpression: { isGroup: false, directKey: { $exists: true } }, name: "direct_conversation_key_unique" },
  );
}

module.exports = { id, run };
