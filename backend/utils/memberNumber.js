const Sequence = require("../models/Sequence");
const Member = require("../models/Member");

const MEMBER_SEQUENCE_KEY = "memberNumber";

const getHighestMemberSequence = async () => {
  const rows = await Member.aggregate([
    {
      $match: {
        memberNumber: { $regex: /^BM\d+$/i },
        isDeleted: { $ne: true },
      },
    },
    {
      $project: {
        number: {
          $convert: {
            input: { $substrCP: ["$memberNumber", 2, { $strLenCP: "$memberNumber" }] },
            to: "int",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    { $sort: { number: -1 } },
    { $limit: 1 },
  ]);
  return Number(rows?.[0]?.number || 0);
};

const generateMemberNumber = async () => {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const floor = await getHighestMemberSequence();
      // One atomic pipeline update avoids MongoDB's conflict error when
      // `$max` and `$inc` both target `seq`. The next sequence value is always
      // greater than both the stored counter and the highest live BM### member.
      const counter = await Sequence.findOneAndUpdate(
        { _id: MEMBER_SEQUENCE_KEY },
        [
          {
            $set: {
              seq: {
                $add: [
                  { $max: [{ $ifNull: ["$seq", 0] }, floor] },
                  1,
                ],
              },
            },
          },
        ],
        { returnDocument: "after", upsert: true, updatePipeline: true }
      ).lean();

      const number = Number(counter?.seq || 0);
      if (!number) throw new Error("Unable to allocate a Benevolent MIDAX member number.");

      const memberNumber = `BM${String(number).padStart(3, "0")}`;
      const collision = await Member.exists({ memberNumber });
      if (!collision) return memberNumber;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to allocate a unique Benevolent MIDAX member number.");
};

const normalizeLegacyMemberNumber = (value) => {
  const raw = String(value ?? "").trim().toUpperCase();
  if (/^BM\d{3,}$/.test(raw)) return raw;
  return "";
};

module.exports = {
  generateMemberNumber,
  normalizeLegacyMemberNumber,
};
