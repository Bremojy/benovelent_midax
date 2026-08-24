const Member = require("../models/Member");

module.exports = {
  id: "002_migrate_member_occupation_to_position",
  async run() {
    const result = await Member.updateMany(
      {
        occupation: { $exists: true, $nin: ["", null] },
        $or: [
          { position: { $exists: false } },
          { position: "" },
          { position: null },
        ],
      },
      [{ $set: { position: "$occupation" } }]
    );

    return result;
  },
};
