const Finance = require("../models/Finance");
const redisCache = require("./redisCache");

const {
  VALID_BALANCE_STATUSES,
  CREDIT_TYPES,
  directionFor,
  calculateEntries,
} = require("./financeLedgerMath");

const validBalanceMatch = (extra = {}) => ({
  ...extra,
  status: { $in: [...VALID_BALANCE_STATUSES] },
  hidden: { $ne: true },
});

const invalidateFinanceCache = async () => {
  await Promise.allSettled([
    redisCache.invalidatePrefix("finance:") ,
    redisCache.invalidatePrefix("admin:dashboard"),
    redisCache.invalidatePrefix("superadmin:"),
    redisCache.invalidatePrefix("member:")
  ]);
};

const getCurrentBookBalance = async ({ asOf = new Date() } = {}) => {
  const asOfDate = asDate(asOf, new Date());
  const cacheKey = `finance:book-balance:${asOfDate.toISOString().slice(0, 16)}`;
  const cached = await redisCache.getJson(cacheKey);
  if (cached !== null && cached !== undefined) return cached;
  const [agg] = await Finance.aggregate([
    { $match: validBalanceMatch({ transactionDate: { $lte: asOfDate } }) },
    { $group: {
      _id: null,
      credit: { $sum: { $cond: [{ $in: ["$type", [...CREDIT_TYPES]] }, "$amount", 0] } },
      debit: { $sum: { $cond: [{ $in: ["$type", [...CREDIT_TYPES]] }, 0, "$amount"] } },
    }},
  ]);
  const payload = {
    balance: Number(agg?.credit || 0) - Number(agg?.debit || 0),
    asOf: asOfDate.toISOString(),
  };
  await redisCache.setJson(cacheKey, payload, 10).catch(() => {});
  return payload;
};

const getLedger = async ({ startDate, endDate, memberId = null, includeHidden = false, asOf = new Date() } = {}) => {
  const defaultStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const defaultEnd = new Date(Date.UTC(new Date().getUTCFullYear(), 11, 31, 23, 59, 59, 999));
  const start = startOfDay(startDate) || defaultStart;
  const end = endOfDay(endDate) || defaultEnd;
  if (start > end) throw new Error("Enter a valid date range.");
  const scoped = {};
  if (memberId) scoped.member = memberId;
  if (includeHidden) delete scoped.hidden;

  const matchBase = includeHidden
    ? { ...scoped, status: { $in: [...VALID_BALANCE_STATUSES] } }
    : validBalanceMatch(scoped);

  const [openingRows, rangeRows, current] = await Promise.all([
    Finance.find({ ...matchBase, transactionDate: { $lt: start } }).sort({ transactionDate: 1, createdAt: 1 }).lean(),
    Finance.find({ ...matchBase, transactionDate: { $gte: start, $lte: end } })
      .populate("member", "fullName memberNumber")
      .populate("contributor", "fullName memberNumber")
      .sort({ transactionDate: 1, createdAt: 1 }).lean(),
    memberId ? getCurrentBookBalanceForMember(memberId, asOf) : getCurrentBookBalance({ asOf }),
  ]);
  const opening = calculateEntries(openingRows, 0).closingBalance;
  const calculated = calculateEntries(rangeRows, opening);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    openingBalance: opening,
    closingBalance: calculated.closingBalance,
    currentBookBalance: Number(current?.balance || 0),
    asOf: current?.asOf || asDate(asOf, new Date()).toISOString(),
    entries: calculated.entries,
    totals: calculated.totals,
  };
};

const getCurrentBookBalanceForMember = async (memberId, asOf = new Date()) => {
  const asOfDate = asDate(asOf, new Date());
  const [agg] = await Finance.aggregate([
    { $match: validBalanceMatch({ member: memberId, transactionDate: { $lte: asOfDate } }) },
    { $group: {
      _id: null,
      credit: { $sum: { $cond: [{ $in: ["$type", [...CREDIT_TYPES]] }, "$amount", 0] } },
      debit: { $sum: { $cond: [{ $in: ["$type", [...CREDIT_TYPES]] }, 0, "$amount"] } },
    }},
  ]);
  return { balance: Number(agg?.credit || 0) - Number(agg?.debit || 0), asOf: asOfDate.toISOString() };
};

module.exports = {
  VALID_BALANCE_STATUSES,
  CREDIT_TYPES,
  directionFor,
  calculateEntries,
  getLedger,
  getCurrentBookBalance,
  invalidateFinanceCache,
};
