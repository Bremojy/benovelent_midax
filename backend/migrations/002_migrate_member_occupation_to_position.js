const Member = require("../models/Member");

module.exports = async function migrateMemberOccupationToPosition() {
  const result = await Member.updateMany(
    { occupation: { $exists: true, $nin: ["", null] }, $or: [{ position: { $exists: false } }, { position: "" }, { position: null }] },
    [{ $set: { position: "$occupation" } }]
  );
  return result;
};
