const Member = require("../models/Member");
const Admin = require("../models/Admin");
const Contribution = require("../models/Contribution");
const Finance = require("../models/Finance");
const SupportRequest = require("../models/SupportRequest");
const Dependent = require("../models/Dependent");
const DependentEditRequest = require("../models/DependentEditRequest");
const AuditLog = require("../models/AuditLog");
const News = require("../models/News");
const { getLedger: getAuthoritativeLedger } = require("../services/financeLedgerService");
const { buildPdf } = require("../utils/simplePdf");

const parseRange = (startDate, endDate) => {
  const start = new Date(`${String(startDate || "").trim()}T00:00:00.000Z`);
  const end = new Date(`${String(endDate || "").trim()}T23:59:59.999Z`);
  if (!startDate || !endDate || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new Error("Enter a valid report date range.");
  return { start, end, startText: start.toISOString().slice(0, 10), endText: end.toISOString().slice(0, 10) };
};

const buildManagementReports = async ({ startDate, endDate } = {}) => {
  const { start, end, startText, endText } = parseRange(startDate, endDate);
  const periodFinance = { transactionDate: { $gte: start, $lte: end }, status: { $in: ["approved", "completed"] }, hidden: { $ne: true } };
  const periodContrib = { createdAt: { $gte: start, $lte: end } };
  const [ledger, totalMembers, activeMembers, inactiveMembers, suspendedMembers, totalDependents, pendingDependentVerifications, pendingEditRequests, contributionAgg, supportAgg, auditCount, newsCount, publishedNews, admins, financeRows] = await Promise.all([
    getAuthoritativeLedger({ startDate: startText, endDate: endText }),
    Member.countDocuments({ role: "member", isDeleted: false }),
    Member.countDocuments({ role: "member", status: "active", isDeleted: false }),
    Member.countDocuments({ role: "member", status: "inactive", isDeleted: false }),
    Member.countDocuments({ role: "member", status: "suspended", isDeleted: false }),
    Dependent.countDocuments({ active: true }),
    Dependent.countDocuments({ active: true, verified: false }),
    DependentEditRequest.countDocuments({ status: "pending" }),
    Contribution.aggregate([{ $match: periodContrib }, { $group: { _id: null, expected: { $sum: "$expectedAmount" }, paid: { $sum: "$paidAmount" }, outstanding: { $sum: "$balance" }, members: { $addToSet: "$member" } } }]),
    SupportRequest.aggregate([{ $match: { createdAt: { $gte: start, $lte: end } } }, { $group: { _id: "$status", count: { $sum: 1 }, requested: { $sum: "$requestedAmount" }, approved: { $sum: "$approvedAmount" }, disbursed: { $sum: "$disbursedAmount" } } }]),
    AuditLog.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    News.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    News.countDocuments({ published: true, status: "published", publishDate: { $gte: start, $lte: end } }),
    Admin.countDocuments({ status: { $ne: "deleted" } }),
    Finance.aggregate([{ $match: periodFinance }, { $group: { _id: null,
      transactions: { $sum: 1 },
      moneyIn: { $sum: { $cond: [{ $in: ["$type", ["contribution", "income", "refund"]] }, "$amount", 0] } },
      moneyOut: { $sum: { $cond: [{ $in: ["$type", ["contribution", "income", "refund"]] }, 0, "$amount"] } },
      contributions: { $sum: { $cond: [{ $eq: ["$type", "contribution"] }, "$amount", 0] } },
      supportPayments: { $sum: { $cond: [{ $eq: ["$type", "claim"] }, "$amount", 0] } },
      claims: { $sum: { $cond: [{ $in: ["$type", ["claim", "expense", "withdrawal"]] }, "$amount", 0] } },
    } }]),
  ]);
  const financeAgg = financeRows[0] || {};
  const statusMap = Object.fromEntries(supportAgg.map((x) => [x._id, x]));
  const financial = {
    openingBalance: Number(ledger.openingBalance || 0), closingBalance: Number(ledger.closingBalance || 0), currentBookBalance: Number(ledger.currentBookBalance || 0),
    moneyIn: financeAgg.moneyIn == null ? Number(ledger.totals?.credit || 0) : Number(financeAgg.moneyIn),
    moneyOut: financeAgg.moneyOut == null ? Number(ledger.totals?.debit || 0) : Number(financeAgg.moneyOut),
    transactions: Number(financeAgg.transactions || ledger.entries?.length || 0), contributions: Number(financeAgg.contributions || 0), supportPayments: Number(financeAgg.supportPayments || 0), claims: Number(financeAgg.claims || 0),
  };
  const support = {
    total: supportAgg.reduce((n, x) => n + Number(x.count || 0), 0),
    pending: Number(statusMap.Pending?.count || 0) + Number(statusMap["Under Review"]?.count || 0) + Number(statusMap.pending?.count || 0),
    approved: Number(statusMap.Approved?.count || 0) + Number(statusMap.approved?.count || 0),
    declined: Number(statusMap.Rejected?.count || 0) + Number(statusMap.rejected?.count || 0) + Number(statusMap.Declined?.count || 0),
    requested: supportAgg.reduce((n, x) => n + Number(x.requested || 0), 0),
    approvedAmount: supportAgg.reduce((n, x) => n + Number(x.approved || 0), 0),
    disbursedAmount: supportAgg.reduce((n, x) => n + Number(x.disbursed || 0), 0),
  };
  return { success: true, period: { startDate: startText, endDate: endText }, generatedAt: new Date().toISOString(), financial, members: { total: totalMembers, active: activeMembers, inactive: inactiveMembers, suspended: suspendedMembers, administrators: admins }, contributions: { expected: Number(contributionAgg?.[0]?.expected || 0), paid: Number(contributionAgg?.[0]?.paid || 0), outstanding: Number(contributionAgg?.[0]?.outstanding || 0), membersCharged: contributionAgg?.[0]?.members?.length || 0 }, support, dependents: { total: totalDependents, requiringVerification: pendingDependentVerifications, pendingEditRequests }, activity: { auditEvents: auditCount, newsCreated: newsCount, newsPublished: publishedNews }, ledger: { entries: ledger.entries || [], totals: ledger.totals || {}, openingBalance: ledger.openingBalance, closingBalance: ledger.closingBalance, currentBookBalance: ledger.currentBookBalance, asOf: ledger.asOf } };
};

const csv = (report) => {
  const lines = [
    ["Benevolent Constitution Management Report"], ["Midax Petroleum Marketing"], ["P.O. Box 7432 - 00300 Nairobi"], ["Website", "www.midax.co.ke"], ["Email", "marketing@midax.co.ke / info@midax.co.ke"], ["Services", "Fuels | Lubricants | LPG Gas | Service | Carwash"], ["Period", report.period.startDate, report.period.endDate], ["Generated At", report.generatedAt], [],
    ["FINANCIAL"], ["Opening Balance", report.financial.openingBalance], ["Money In", report.financial.moneyIn], ["Money Out", report.financial.moneyOut], ["Closing Balance", report.financial.closingBalance], ["Current Book Balance", report.financial.currentBookBalance], ["Transactions", report.financial.transactions], ["Contributions", report.financial.contributions], ["Support Payments", report.financial.supportPayments], ["Claims", report.financial.claims], [],
    ["MEMBERS"], ["Total", report.members.total], ["Active", report.members.active], ["Inactive", report.members.inactive], ["Suspended", report.members.suspended], ["Administrators", report.members.administrators], [],
    ["CONTRIBUTIONS"], ["Expected", report.contributions.expected], ["Paid", report.contributions.paid], ["Outstanding", report.contributions.outstanding], ["Members Charged", report.contributions.membersCharged], [],
    ["SUPPORT / CLAIMS"], ["Total", report.support.total], ["Pending", report.support.pending], ["Approved", report.support.approved], ["Declined", report.support.declined], ["Requested Amount", report.support.requested], ["Approved Amount", report.support.approvedAmount], ["Disbursed Amount", report.support.disbursedAmount], [],
    ["DEPENDENTS"], ["Total", report.dependents.total], ["Requiring Verification", report.dependents.requiringVerification], ["Pending Edit Requests", report.dependents.pendingEditRequests], [],
    ["ACTIVITY"], ["Audit Events", report.activity.auditEvents], ["News Created", report.activity.newsCreated], ["News Published", report.activity.newsPublished], [],
    ["LEDGER"], ["Date", "Transaction", "Description", "Category", "Direction", "Amount", "Running Balance", "Status"],
    ...report.ledger.entries.map((e) => [e.date ? new Date(e.date).toISOString() : "", e.transactionNumber || e.referenceNumber || "", e.description, e.category, e.direction, e.amount, e.runningBalance, e.status]),
  ];
  return lines.map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
};

const pdf = (report) => buildPdf({
  title: "Benevolent Constitution Management Report",
  subtitle: `${report.period.startDate} to ${report.period.endDate} • Generated ${new Date(report.generatedAt).toLocaleString()}`,
  lines: [
    "REPORT REFERENCE: " + `REPORT-${report.period.startDate}-${report.period.endDate}`,
    "",
    "FINANCIAL",
    `Opening balance: KES ${report.financial.openingBalance.toLocaleString()}`,
    `Money in: KES ${report.financial.moneyIn.toLocaleString()}`,
    `Money out: KES ${report.financial.moneyOut.toLocaleString()}`,
    `Closing balance: KES ${report.financial.closingBalance.toLocaleString()}`,
    `Current book balance: KES ${report.financial.currentBookBalance.toLocaleString()}`,
    `Transactions: ${report.financial.transactions}`,
    `Contributions: KES ${report.financial.contributions.toLocaleString()}`,
    `Support payments: KES ${report.financial.supportPayments.toLocaleString()}`,
    `Claims/disbursements: KES ${report.financial.claims.toLocaleString()}`,
    "",
    "MEMBERS",
    `Total: ${report.members.total}`,
    `Active: ${report.members.active}`,
    `Inactive: ${report.members.inactive}`,
    `Suspended: ${report.members.suspended}`,
    `Administrators: ${report.members.administrators}`,
    "",
    "CONTRIBUTIONS",
    `Expected: KES ${report.contributions.expected.toLocaleString()}`,
    `Paid: KES ${report.contributions.paid.toLocaleString()}`,
    `Outstanding: KES ${report.contributions.outstanding.toLocaleString()}`,
    `Members charged: ${report.contributions.membersCharged}`,
    "",
    "SUPPORT / CLAIMS",
    `Total: ${report.support.total}`,
    `Pending: ${report.support.pending}`,
    `Approved: ${report.support.approved}`,
    `Declined: ${report.support.declined}`,
    `Requested amount: KES ${report.support.requested.toLocaleString()}`,
    `Approved amount: KES ${report.support.approvedAmount.toLocaleString()}`,
    `Disbursed amount: KES ${report.support.disbursedAmount.toLocaleString()}`,
    "",
    "DEPENDENTS & ACTIVITY",
    `Registered dependents: ${report.dependents.total}`,
    `Requiring verification: ${report.dependents.requiringVerification}`,
    `Pending edit requests: ${report.dependents.pendingEditRequests}`,
    `Audit events: ${report.activity.auditEvents}`,
    `News created: ${report.activity.newsCreated}`,
    `News published: ${report.activity.newsPublished}`,
  ],
});

exports.getManagementReports = async (req, res) => {
  try { return res.json(await buildManagementReports({ startDate: req.query.startDate, endDate: req.query.endDate })); }
  catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

exports.exportManagementReportsCsv = async (req, res) => {
  try { const report = await buildManagementReports({ startDate: req.query.startDate, endDate: req.query.endDate }); res.setHeader("Content-Type", "text/csv; charset=utf-8"); res.setHeader("Content-Disposition", `attachment; filename="benevolent-report-${report.period.startDate}-to-${report.period.endDate}.csv"`); return res.send(csv(report)); }
  catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

exports.exportManagementReportsPdf = async (req, res) => {
  try { const report = await buildManagementReports({ startDate: req.query.startDate, endDate: req.query.endDate }); const buffer = pdf(report); res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", `attachment; filename="benevolent-report-${report.period.startDate}-to-${report.period.endDate}.pdf"`); return res.end(buffer); }
  catch (error) { return res.status(400).json({ success: false, message: error.message }); }
};

module.exports.parseRange = parseRange;
module.exports.buildManagementReports = buildManagementReports;
module.exports.managementReportCsv = csv;
