const Member = require("../models/Member");

module.exports = {
  id: "002_migrate_member_occupation_to_position",
  async run() {
    const filter = {
      occupation: { $exists: true, $nin: ["", null] },
      $or: [
        { position: { $exists: false } },
        { position: "" },
        { position: null },
      ],
    };

    // Do not pass an aggregation pipeline array to Mongoose updateMany().
    // Mongoose 9 requires an explicit updatePipeline option for that form,
    // and older deployments can reject it altogether. A small bulkWrite is
    // deterministic, idempotent, and uses normal update operators only.
    const members = await Member.find(filter).select({ _id: 1, occupation: 1 }).lean();
    if (!members.length) return { matchedCount: 0, modifiedCount: 0 };

    const operations = members
      .map((member) => ({
        _id: member._id,
        position: String(member.occupation || "").trim(),
      }))
      .filter((member) => member.position)
      .map((member) => ({
        updateOne: {
          filter: {
            _id: member._id,
            $or: [
              { position: { $exists: false } },
              { position: "" },
              { position: null },
            ],
          },
          update: { $set: { position: member.position } },
        },
      }));

    if (!operations.length) return { matchedCount: 0, modifiedCount: 0 };
    return Member.bulkWrite(operations, { ordered: false });
  },
};
