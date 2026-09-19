const Finance = require("../models/Finance");
const Member = require("../models/Member");
const Admin = require("../models/Admin");
const Notification = require("../models/Notification");
const Contribution = require("../models/Contribution");
const redisCache = require("../services/redisCache");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");
const { getLedger: getAuthoritativeLedger, getCurrentBookBalance, invalidateFinanceCache } = require("../services/financeLedgerService");
const { buildPdf } = require("../utils/simplePdf");
const createAuditLog = require("../utils/createAuditLog");

/* =====================================================
   GENERATE TRANSACTION NUMBER
===================================================== */

const generateTransactionNumber = () => {

    const random = Math.floor(
        100000 + Math.random() * 900000
    );

    return `BMX-${Date.now()}-${random}`;

};


/* =====================================================
   CREATE TRANSACTION
===================================================== */

exports.createTransaction = async (req, res) => {
    try {
        const { member, employeeNumber, type, category, amount, description, paymentMethod, referenceNumber, receiptNumber, notes, transactionDate, contributorType, contributorId } = req.body || {};
        let memberId = member || null;
        if (!memberId && employeeNumber) {
            const found = await Member.findOne({ memberNumber: String(employeeNumber).trim() }).select("_id").lean();
            memberId = found?._id || null;
        }
        if (!type || amount === undefined || amount === null || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: "Transaction type and a positive amount are required." });
        }
        if (type === "contribution" && paymentMethod !== undefined && String(paymentMethod).toLowerCase() !== "payroll") {
            return res.status(400).json({ success: false, code: "PAYROLL_ONLY_CONTRIBUTIONS", message: "Ordinary Benevolent MIDAX contributions are recorded from payroll only." });
        }
        const memberRequiredFor = new Set(["contribution", "claim", "refund"]);
        const scope = type === "contribution" ? String(contributorType || (memberId ? "member" : "all")).toLowerCase() : null;
        if (type === "contribution" && !["member", "admin", "all"].includes(scope)) {
            return res.status(400).json({ success: false, message: "Select whether the contribution is from a member, admin/leader, or all members and admins." });
        }
        if (scope === "member") {
            if (!memberId) return res.status(400).json({ success: false, message: "Benevolent MIDAX Number is required for a member contribution." });
            if (!await Member.exists({ _id: memberId })) return res.status(404).json({ success: false, message: "Benevolent MIDAX Number not found." });
        } else if (scope === "admin") {
            memberId = null;
            const requesterRole = String(req.user?.role || "").toLowerCase();
            if (requesterRole === "admin") {
                // The contributor is the logged-in Admin/leader.
            } else if (requesterRole === "superadmin") {
                if (!contributorId || !await Admin.exists({ _id: contributorId })) return res.status(400).json({ success: false, message: "Select a valid Admin / leader for this contribution." });
            } else {
                return res.status(403).json({ success: false, message: "Only Admin or SuperAdmin can record an Admin contribution." });
            }
        } else if (scope === "all") {
            memberId = null;
        } else if (memberId && !await Member.exists({ _id: memberId })) {
            return res.status(404).json({ success: false, message: "Benevolent MIDAX Number not found." });
        }
        if (memberRequiredFor.has(type) && !memberId && type !== "contribution") {
            return res.status(400).json({ success: false, message: "Benevolent MIDAX Number is required for this transaction type." });
        }
        let contributor = null;
        let contributorModel = null;
        let contributorName = "";
        if (scope === "member") {
            contributor = memberId;
            contributorModel = "Member";
            const found = await Member.findById(memberId).select("fullName").lean();
            contributorName = found?.fullName || "Member";
        } else if (scope === "admin") {
            contributor = contributorId || req.user._id;
            contributorModel = "Admin";
            const selectedAdmin = await Admin.findById(contributor).select("fullName name").lean();
            contributorName = selectedAdmin?.fullName || selectedAdmin?.name || req.user.fullName || req.user.name || "Admin / Leader";
        } else if (scope === "all") {
            contributorName = "All members & admins";
        }
        const transaction = await Finance.create({
            member: memberId,
            transactionNumber: generateTransactionNumber(),
            type, category, amount: Number(amount), description, paymentMethod: type === "contribution" ? "Payroll" : paymentMethod,
            referenceNumber, receiptNumber, notes,
            contributorType: scope, contributor, contributorModel, contributorName,
            transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
            status: "approved",
            approvedBy: req.user._id,
            approvedAt: new Date(),
        });
        if (memberId) {
            await Notification.create({
                recipient: memberId,
                recipientModel: "Member",
                sender: req.user._id,
                senderModel: String(req.user.role || "admin") === "superadmin" ? "SuperAdmin" : "Admin",
                title: "Finance Update",
                message: `A ${type} transaction of KSh ${amount} has been recorded.`,
                type: "finance", referenceId: transaction._id, referenceModel: "Finance"
            });
        }
        await invalidateFinanceCache();
        return res.status(201).json({ success: true, message: "Transaction created successfully.", transaction });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   GET ALL TRANSACTIONS
===================================================== */

exports.getTransactions = async (req, res) => {
    const cacheKey = `finance:list:${String(req.user?.role || "user")}:${JSON.stringify(req.query || {})}`;
    const cached = await redisCache.getJson(cacheKey);
    if (cached !== null) return res.json(cached);
    const __originalJson = res.json.bind(res);
    res.json = (body) => { redisCache.setJson(cacheKey, body, 15).catch(() => {}); return __originalJson(body); };


    try {

        const page = Number(req.query.page) || 1;

        const limit = Number(req.query.limit) || 20;

        const skip = (page - 1) * limit;

        const filter = {};
        if (String(req.query.includeHidden || "false").toLowerCase() !== "true") filter.hidden = { $ne: true };

        if (req.query.type)
            filter.type = req.query.type;

        if (req.query.status)
            filter.status = req.query.status;

        const total =
            await Finance.countDocuments(filter);

        const transactions =
            await Finance.find(filter)

            .populate(

                "member",

                "fullName memberNumber profileImage"

            )

            .populate(

                "approvedBy",

                "fullName"

            )

            .sort({

                transactionDate: -1,
                createdAt: -1

            })

            .skip(skip)

            .limit(limit)

            .lean();

        res.json({

            success: true,

            total,

            page,

            pages: Math.ceil(total / limit),

            transactions

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/* =====================================================
   GET SINGLE TRANSACTION
===================================================== */

exports.getTransaction = async (req, res) => {
    try {
        const role = String(req.user?.role || "").toLowerCase();
        if (!["member", "admin", "superadmin"].includes(role)) {
            return res.status(403).json({ success: false, message: "You do not have permission to view finance records." });
        }
        if (role === "member") {
            const transaction = await Finance.findOne({ _id: req.params.id, member: req.user._id })
                .select("transactionNumber type category amount description paymentMethod referenceNumber receiptNumber notes transactionDate status contributorType contributorName hidden createdAt updatedAt")
                .lean();
            if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found." });
            return res.json({ success: true, transaction });
        }
        const transaction = await Finance.findById(req.params.id)
            .populate("member", "fullName memberNumber email phone")
            .populate("approvedBy", "fullName")
            .lean();
        if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found." });
        return res.json({ success: true, transaction });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   UPDATE TRANSACTION
===================================================== */

exports.updateTransaction = async (req, res) => {

    try {

        const transaction = await Finance.findById(req.params.id);

        if (!transaction) {

            return res.status(404).json({
                success: false,
                message: "Transaction not found."
            });

        }

        const linkedContribution = await Contribution.findOne({ finance: transaction._id });
        if (linkedContribution && req.body.type && req.body.type !== "contribution") {
            return res.status(400).json({ success: false, message: "Linked contribution transactions must remain type 'contribution'. Edit the amount/date/payment details instead." });
        }

        const fields = [
            "type",
            "category",
            "amount",
            "description",
            "paymentMethod",
            "referenceNumber",
            "receiptNumber",
            "transactionDate",
            "notes",
            "contributorType",
            "contributorName"
        ];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                transaction[field] = req.body[field];
            }
        });

        if (req.body.employeeNumber !== undefined) {
            const employeeNumber = String(req.body.employeeNumber || "").trim();
            if (employeeNumber) {
                const member = await Member.findOne({ memberNumber: employeeNumber }).select("_id").lean();
                if (!member) return res.status(404).json({ success: false, message: "Benevolent MIDAX Number not found." });
                transaction.member = member._id;
            } else if (["contribution", "claim", "refund"].includes(transaction.type)) {
                return res.status(400).json({ success: false, message: "Benevolent MIDAX Number is required for this transaction type." });
            } else {
                transaction.member = null;
            }
        }

        if (transaction.type === "contribution") {
            if (req.body.paymentMethod !== undefined && String(req.body.paymentMethod).toLowerCase() !== "payroll") return res.status(400).json({ success: false, code: "PAYROLL_ONLY_CONTRIBUTIONS", message: "Ordinary Benevolent MIDAX contributions are recorded from payroll only." });
            transaction.paymentMethod = "Payroll";
            const scope = String(req.body.contributorType || transaction.contributorType || (transaction.member ? "member" : "all")).toLowerCase();
            if (!["member", "admin", "all"].includes(scope)) return res.status(400).json({ success: false, message: "Invalid contribution source." });
            transaction.contributorType = scope;
            if (scope === "member") {
                const memberId = transaction.member;
                if (!memberId || !await Member.exists({ _id: memberId })) return res.status(400).json({ success: false, message: "A valid member is required for this contribution." });
                const member = await Member.findById(memberId).select("fullName").lean();
                transaction.contributor = memberId;
                transaction.contributorModel = "Member";
                transaction.contributorName = member?.fullName || transaction.contributorName || "Member";
            } else if (scope === "admin") {
                transaction.member = null;
                const selectedAdminId = req.body.contributorId || transaction.contributor || req.user._id;
                if (!await Admin.exists({ _id: selectedAdminId })) return res.status(400).json({ success: false, message: "Select a valid Admin / leader for this contribution." });
                transaction.contributor = selectedAdminId;
                transaction.contributorModel = "Admin";
                const selectedAdmin = await Admin.findById(selectedAdminId).select("fullName name").lean();
                transaction.contributorName = selectedAdmin?.fullName || selectedAdmin?.name || transaction.contributorName || "Admin / Leader";
            } else {
                transaction.member = null;
                transaction.contributor = null;
                transaction.contributorModel = null;
                transaction.contributorName = "All members & admins";
            }
        }
        await transaction.save();
        if (transaction.member) {
            await Notification.create({
                recipient: transaction.member,
                recipientModel: "Member",
                sender: req.user._id,
                senderModel: String(req.user.role || "admin") === "superadmin" ? "SuperAdmin" : "Admin",
                title: "Finance Record Updated",
                message: `Your linked ${transaction.type} account record was updated to KSh ${Number(transaction.amount || 0).toLocaleString("en-KE")}.`,
                type: "finance", referenceId: transaction._id, referenceModel: "Finance"
            });
        }

        // A contribution finance transaction and its Contribution record are one accounting event.
        if (transaction.type === "contribution") {
            const linked = await Contribution.findOne({ finance: transaction._id });
            if (linked) {
                linked.member = transaction.member || linked.member;
                linked.expectedAmount = Number(transaction.amount || 0);
                linked.paidAmount = Number(transaction.amount || 0);
                linked.source = "payroll";
                linked.paymentMethod = "Payroll";
                linked.receiptNumber = transaction.receiptNumber || linked.receiptNumber;
                linked.mpesaCode = transaction.referenceNumber || linked.mpesaCode;
                linked.paymentDate = transaction.transactionDate;
                linked.notes = transaction.notes || linked.notes;
                await linked.save();
            }
        }

        await invalidateFinanceCache();
        res.json({

            success: true,

            message: "Transaction updated successfully.",

            transaction

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/* =====================================================
   HIDE TRANSACTION (SUPERADMIN)
===================================================== */

exports.hideTransaction = async (req, res) => {
    try {
        if (String(req.user?.role || "").toLowerCase() !== "superadmin") {
            return res.status(403).json({ success: false, message: "Only SuperAdmin can hide a transaction." });
        }
        const transaction = await Finance.findById(req.params.id);
        if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found." });
        transaction.hidden = req.body?.hidden !== false;
        transaction.hiddenAt = transaction.hidden ? new Date() : null;
        transaction.hiddenBy = transaction.hidden ? req.user._id : null;
        await transaction.save();
        if (transaction.member) {
            await Notification.create({
                recipient: transaction.member,
                recipientModel: "Member",
                sender: req.user._id,
                senderModel: "SuperAdmin",
                title: transaction.hidden ? "Finance Record Hidden" : "Finance Record Restored",
                message: transaction.hidden ? "A financial record linked to your account has been hidden from the community ledger." : "A financial record linked to your account has been restored to the community ledger.",
                type: "finance", referenceId: transaction._id, referenceModel: "Finance"
            });
        }
        await invalidateFinanceCache();
        return res.json({ success: true, hidden: transaction.hidden, message: transaction.hidden ? "Transaction hidden from the community ledger." : "Transaction restored to the community ledger.", transaction });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   DELETE TRANSACTION
===================================================== */

exports.deleteTransaction = async (req, res) => {
    try {
        const role = String(req.user?.role || "").toLowerCase();
        if (!["admin", "superadmin"].includes(role)) {
            return res.status(403).json({ success: false, message: "Only Admin or SuperAdmin can remove a financial transaction." });
        }
        const transaction = await Finance.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found.",
            });
        }

        const linkedContribution = await Contribution.findOne({ finance: transaction._id }).select("_id month year").lean();
        const affectedMember = transaction.member;
        const protectedSettled = transaction.reconciled === true || ["approved", "completed"].includes(String(transaction.status || "").toLowerCase());
        let action = "deleted";

        // A finance delete is always an executed operation. For an approved/settled
        // record or a transaction linked to a contribution, execute it as an auditable
        // visibility archive instead of returning a misleading 409. Unsettled, unlinked
        // records can still be physically deleted by SuperAdmin.
        if (role === "superadmin" && !protectedSettled && !linkedContribution) {
            await transaction.deleteOne();
            action = "deleted";
        } else {
            transaction.hidden = true;
            transaction.hiddenAt = new Date();
            transaction.hiddenBy = req.user._id;
            await transaction.save();
            action = "archived";
        }

        await createAuditLog({
            user: req.user._id,
            userRole: req.user.role,
            action: action === "deleted" ? "FINANCE_TRANSACTION_DELETED" : "FINANCE_TRANSACTION_ARCHIVED",
            module: "FINANCE",
            description: action === "deleted"
                ? `SuperAdmin permanently deleted finance transaction ${transaction._id}.`
                : `Finance transaction ${transaction._id} was archived from the operational ledger by ${role === "superadmin" ? "SuperAdmin" : "Admin"}.`,
            req,
            metadata: { transactionId: transaction._id, status: transaction.status, type: transaction.type, amount: transaction.amount, linkedContribution: Boolean(linkedContribution), protectedSettled },
        });
        if (affectedMember) {
            await Notification.create({
                recipient: affectedMember,
                recipientModel: "Member",
                sender: req.user._id,
                senderModel: role === "superadmin" ? "SuperAdmin" : "Admin",
                title: "Finance Record Removed",
                message: `A financial record linked to your account was removed by ${role === "superadmin" ? "SuperAdmin" : "an Admin / leader"}.`,
                type: "finance", referenceId: transaction._id, referenceModel: "Finance"
            });
        }
        await invalidateFinanceCache();
        return res.json({
            success: true,
            action,
            message: action === "deleted"
                ? "Transaction permanently deleted successfully."
                : "Transaction archived successfully and removed from the operational ledger. The audit record is retained.",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};



/* =====================================================
   APPROVE TRANSACTION
===================================================== */

exports.approveTransaction = async (req, res) => {

    try {

        const transaction = await Finance.findById(req.params.id);

        if (!transaction) {

            return res.status(404).json({

                success: false,

                message: "Transaction not found."

            });

        }

        transaction.status = "approved";

        transaction.approvedBy = req.user._id;

        transaction.approvedAt = new Date();

        await transaction.save();

        await Notification.create({

            recipient: transaction.member,

            sender: req.user._id,

            title: "Transaction Approved",

            message: `Your ${transaction.type} of KSh ${transaction.amount} has been approved.`,

            type: "finance",

            referenceId: transaction._id,

            referenceModel: "Finance"

        });

        res.json({

            success: true,

            message: "Transaction approved successfully.",

            transaction

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/* =====================================================
   REJECT TRANSACTION
===================================================== */

exports.rejectTransaction = async (req, res) => {

    try {

        const transaction = await Finance.findById(req.params.id);

        if (!transaction) {

            return res.status(404).json({

                success: false,

                message: "Transaction not found."

            });

        }

        transaction.status = "rejected";

        transaction.approvedBy = req.user._id;

        transaction.approvedAt = new Date();

        await transaction.save();

        await Notification.create({

            recipient: transaction.member,

            sender: req.user._id,

            title: "Transaction Rejected",

            message: `Your ${transaction.type} of KSh ${transaction.amount} has been rejected.`,

            type: "finance",

            referenceId: transaction._id,

            referenceModel: "Finance"

        });

        res.json({

            success: true,

            message: "Transaction rejected successfully.",

            transaction

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/* =====================================================
   MEMBER TRANSACTION HISTORY
===================================================== */

exports.getMemberTransactions = async (req, res) => {

    try {

        const requestedMemberId = req.params.memberId || req.user._id;

        if (req.user?.role === "member" && String(requestedMemberId) !== String(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You can only view your own finance records."
            });
        }

        const transactions = await Finance.find({

            member: requestedMemberId

        })

        .sort({

            transactionDate: -1,
            createdAt: -1

        })

        .lean();

        res.json({

            success: true,

            count: transactions.length,

            transactions

        });

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};



/* =====================================================
   ADMIN LEDGER / BALANCED BOOK
===================================================== */

exports.getLedger = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const role = String(req.user?.role || "").toLowerCase();
    const ledger = await getAuthoritativeLedger({
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      memberId: role === "member" ? req.user._id : null,
      includeHidden: role === "superadmin" && String(req.query.includeHidden || "false").toLowerCase() === "true",
    });
    return res.json({ success: true, year, ...ledger });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* =====================================================
   FINANCE DASHBOARD SUMMARY
===================================================== */

exports.getFinanceSummary = async (req, res) => {
  try {
    const year = Number(req.query?.year) || new Date().getFullYear();
    const ledger = await getAuthoritativeLedger({ startDate: `${year}-01-01`, endDate: `${year}-12-31` });
    const totalTransactions = ledger.entries.length;
    const [contributions, claims, expenses, income] = await Promise.all([
      Finance.aggregate([{ $match: validFinancePeriodMatch(year, "contribution") }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Finance.aggregate([{ $match: validFinancePeriodMatch(year, "claim") }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Finance.aggregate([{ $match: validFinancePeriodMatch(year, "expense") }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Finance.aggregate([{ $match: validFinancePeriodMatch(year, "income") }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);
    return res.json({
      success: true,
      summary: {
        totalTransactions,
        totalIncome: Number(income?.[0]?.total || 0),
        totalExpenses: Number(expenses?.[0]?.total || 0),
        totalContributions: Number(contributions?.[0]?.total || 0),
        totalClaims: Number(claims?.[0]?.total || 0),
        openingBalance: ledger.openingBalance,
        closingBalance: ledger.closingBalance,
        currentBookBalance: ledger.currentBookBalance,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const validFinancePeriodMatch = (year, type) => ({
  transactionDate: { $gte: new Date(`${year}-01-01T00:00:00.000Z`), $lte: new Date(`${year}-12-31T23:59:59.999Z`) },
  type,
  status: { $in: ["approved", "completed"] },
  hidden: { $ne: true },
});

exports.getMemberAccounts = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    const startDate = String(req.query?.startDate || "").trim();
    const endDate = String(req.query?.endDate || "").trim();
    if (!startDate || !endDate) return res.status(400).json({ success: false, code: "DATE_FILTER_REQUIRED", message: "Select an opening and closing date for the constitution ledger." });
    const ledger = await getAuthoritativeLedger({
      startDate,
      endDate,
      memberId: role === "member" ? req.user._id : null,
      includeHidden: role === "superadmin" && String(req.query.includeHidden || "false").toLowerCase() === "true",
    });
    return res.json({ success: true, ...ledger });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBookBalance = async (req, res) => {
  try {
    const book = await getCurrentBookBalance();
    return res.json({ success: true, ...book });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.constitutionLedger = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    const startDate = String(req.query?.startDate || "").trim();
    const endDate = String(req.query?.endDate || "").trim();
    if (role === "member" && (!startDate || !endDate)) {
      return res.status(400).json({ success: false, code: "DATE_FILTER_REQUIRED", message: "Select a start and end date before loading the constitution ledger." });
    }
    const ledger = await getAuthoritativeLedger({
      startDate: startDate || `${new Date().getFullYear()}-01-01`,
      endDate: endDate || `${new Date().getFullYear()}-12-31`,
      memberId: role === "member" ? req.user._id : null,
      includeHidden: role === "superadmin" && String(req.query.includeHidden || "false").toLowerCase() === "true",
    });
    return res.json({ success: true, ...ledger });
  } catch (error) {
    console.error("Constitution ledger error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};


exports.exportConstitutionLedger = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    const startDate = String(req.query?.startDate || "").trim();
    const endDate = String(req.query?.endDate || "").trim();
    if (!startDate || !endDate) return res.status(400).json({ success: false, message: "Start and end dates are required." });
    const ledger = await getAuthoritativeLedger({ startDate, endDate, memberId: role === "member" ? req.user._id : null });
    const rows = [
      "Benevolent Constitution",
      `Date range: ${ledger.startDate} to ${ledger.endDate}`,
      `Generated: ${new Date().toISOString()}`,
      `Opening balance: KES ${ledger.openingBalance.toFixed(2)}`,
      `Money in: KES ${ledger.totals.credit.toFixed(2)}`,
      `Money out: KES ${ledger.totals.debit.toFixed(2)}`,
      `Closing balance: KES ${ledger.closingBalance.toFixed(2)}`,
      `Current live book balance: KES ${ledger.currentBookBalance.toFixed(2)}`,
      "Report reference: BENE-LEDGER-" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14),
      "Midax Petroleum Marketing | P.O. Box 7432 - 00300 Nairobi | www.midax.co.ke",
      "Email: marketing@midax.co.ke / info@midax.co.ke",
      "Services: Fuels | Lubricants | LPG Gas | Service | Carwash",
      "",
      "DATE | TRANSACTION | DESCRIPTION | CATEGORY | AMOUNT | DIRECTION | STATUS | RUNNING BALANCE",
      ...ledger.entries.map((entry) => `${new Date(entry.date).toISOString().slice(0,10)} | ${entry.transactionNumber} | ${entry.description || "-"} | ${entry.category || "-"} | KES ${entry.amount.toFixed(2)} | ${entry.direction} | ${entry.status} | KES ${entry.runningBalance.toFixed(2)}`),
    ];
    const pdf = buildPdf({ title: "Benevolent Constitution Ledger", subtitle: `A4 ledger report • ${ledger.startDate} to ${ledger.endDate}`, lines: rows });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="benevolent-constitution-ledger-${ledger.startDate}-${ledger.endDate}.pdf"`, "Content-Length": pdf.length });
    return res.send(pdf);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportConstitutionLedgerCsv = async (req, res) => {
  try {
    const role = String(req.user?.role || "").toLowerCase();
    const startDate = String(req.query?.startDate || "").trim();
    const endDate = String(req.query?.endDate || "").trim();
    if (!startDate || !endDate) return res.status(400).json({ success: false, message: "Start and end dates are required." });
    const ledger = await getAuthoritativeLedger({ startDate, endDate, memberId: role === "member" ? req.user._id : null });
    const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["Benevolent Constitution Ledger"],
      ["Date range", ledger.startDate, ledger.endDate],
      ["Opening balance", ledger.openingBalance],
      ["Money in", ledger.totals.credit],
      ["Money out", ledger.totals.debit],
      ["Closing balance", ledger.closingBalance],
      ["Current live book balance", ledger.currentBookBalance],
      [],
      ["Transaction date", "Transaction/reference", "Description", "Category", "Amount", "Direction", "Status", "Running balance"],
      ...ledger.entries.map((entry) => [new Date(entry.date).toISOString(), entry.transactionNumber, entry.description, entry.category, entry.amount, entry.direction, entry.status, entry.runningBalance]),
    ].map((row) => row.map(escape).join(","));
    const csv = lines.join("\r\n");
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="benevolent-constitution-ledger-${startDate}-${endDate}.csv"` });
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadAttachment = async (req, res) => {
  try {
    const transaction = await Finance.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found." });
    if (!req.file) return res.status(400).json({ success: false, message: "Choose an attachment first." });
    transaction.attachment = {
      url: resolveStoredFileUrl(req.file, `/uploads/${req.uploadType || "finance"}`),
      name: String(req.file.originalname || req.file.filename || "attachment").slice(0, 180),
      type: String(req.file.mimetype || "").slice(0, 120),
    };
    await transaction.save();
    return res.json({ success: true, message: "Transaction attachment saved.", transaction });
  } catch (error) {
    console.error("Finance attachment error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
