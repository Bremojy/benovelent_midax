"use strict";

// Read-only production diagnostic. It intentionally performs no writes, deletes,
// index changes, or reconciliations. Run only in an environment with the real
// backend/.env / MONGO_URI configured.
const mongoose = require("mongoose");
const Member = require("../models/Member");

const maskNationalId = (value) => {
  const clean = String(value || "").trim();
  if (!clean) return "<blank>";
  if (clean.length <= 3) return "*".repeat(clean.length);
  return `${"*".repeat(Math.max(0, clean.length - 3))}${clean.slice(-3)}`;
};

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required. No database changes are made by this diagnostic.");
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  const duplicateGroups = await Member.aggregate([
    { $match: { role: "member", isDeleted: { $ne: true }, nationalId: { $type: "string", $ne: "" } } },
    { $project: { nationalId: { $trim: { input: "$nationalId" } } } },
    { $match: { nationalId: { $ne: "" } } },
    { $group: { _id: "$nationalId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  const blankOrMissing = await Member.countDocuments({
    role: "member",
    isDeleted: { $ne: true },
    $or: [
      { nationalId: { $exists: false } },
      { nationalId: null },
      { nationalId: "" },
      { nationalId: /^\\s+$/ },
    ],
  });

  const allNationalIds = await Member.find({
    role: "member",
    nationalId: { $exists: true },
  }).select("nationalId").lean();
  const whitespaceStored = allNationalIds.filter((row) => {
    const raw = String(row.nationalId || "");
    return raw.trim() !== raw;
  }).length;

  const indexes = await Member.collection.indexes();
  const nationalIndexes = indexes.filter((index) => Object.prototype.hasOwnProperty.call(index.key || {}, "nationalId"));

  const report = {
    readOnly: true,
    collection: Member.collection.name,
    activeMemberCount: await Member.countDocuments({ role: "member", isDeleted: { $ne: true } }),
    membersMissingOrBlankNationalId: blankOrMissing,
    whitespacePaddedNationalIds: whitespaceStored,
    duplicateNationalIdGroupCount: duplicateGroups.length,
    duplicateNationalIdGroups: duplicateGroups.map((group) => ({
      maskedNationalId: maskNationalId(group._id),
      count: group.count,
    })),
    nationalIdIndexes: nationalIndexes.map((index) => ({
      name: index.name,
      key: index.key,
      unique: Boolean(index.unique),
      sparse: Boolean(index.sparse),
      partialFilterExpression: index.partialFilterExpression || null,
    })),
  };

  console.log(JSON.stringify(report, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(`National-ID diagnostic failed: ${error.message}`);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exitCode = 1;
});
