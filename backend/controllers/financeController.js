const Finance = require("../models/Finance");
const Member = require("../models/Member");
const Notification = require("../models/Notification");
const Contribution = require("../models/Contribution");

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
        const { member, employeeNumber, type, category, amount, description, paymentMethod, referenceNumber, receiptNumber, notes, transactionDate } = req.body || {};
        let memberId = member || null;
        if (!memberId && employeeNumber) {
            const found = await Member.findOne({ memberNumber: String(employeeNumber).trim() }).select("_id").lean();
            memberId = found?._id || null;
        }
        if (!type || amount === undefined || amount === null || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: "Transaction type and a positive amount are required." });
        }
        const memberRequiredFor = new Set(["contribution", "claim", "refund"]);
        if (memberRequiredFor.has(type) && !memberId) {
            return res.status(400).json({ success: false, message: "Benovelent MIDAX Number is required for this transaction type." });
        }
        if (memberId && !await Member.exists({ _id: memberId })) {
            return res.status(404).json({ success: false, message: "Benovelent MIDAX Number not found." });
        }
        const transaction = await Finance.create({
            member: memberId,
            transactionNumber: generateTransactionNumber(),
            type, category, amount: Number(amount), description, paymentMethod,
            referenceNumber, receiptNumber, notes,
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

        const transaction =
            await Finance.findById(req.params.id)

            .populate(

                "member",

                "fullName memberNumber email phone"

            )

            .populate(

                "approvedBy",

                "fullName"

            );

        if (!transaction) {

            return res.status(404).json({

                success: false,

                message: "Transaction not found."

            });

        }

        res.json({

            success: true,

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
            "notes"
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
                if (!member) return res.status(404).json({ success: false, message: "Benovelent MIDAX Number not found." });
                transaction.member = member._id;
            } else if (["contribution", "claim", "refund"].includes(transaction.type)) {
                return res.status(400).json({ success: false, message: "Benovelent MIDAX Number is required for this transaction type." });
            } else {
                transaction.member = null;
            }
        }

        await transaction.save();

        // A contribution finance transaction and its Contribution record are one accounting event.
        if (transaction.type === "contribution") {
            const linked = await Contribution.findOne({ finance: transaction._id });
            if (linked) {
                linked.member = transaction.member || linked.member;
                linked.expectedAmount = Number(transaction.amount || 0);
                linked.paidAmount = Number(transaction.amount || 0);
                linked.paymentMethod = transaction.paymentMethod;
                linked.receiptNumber = transaction.receiptNumber || linked.receiptNumber;
                linked.mpesaCode = transaction.referenceNumber || linked.mpesaCode;
                linked.paymentDate = transaction.transactionDate;
                linked.notes = transaction.notes || linked.notes;
                await linked.save();
            }
        }

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
        const transaction = await Finance.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found.",
            });
        }

        const linkedContribution = await Contribution.findOne({ finance: transaction._id }).select("_id month year").lean();
        if (linkedContribution) {
            return res.status(409).json({
                success: false,
                code: "LINKED_CONTRIBUTION",
                message: "This transaction is linked to a contribution. Edit it from the contribution record or delete the contribution first to keep the financial ledger consistent.",
            });
        }

        await transaction.deleteOne();
        return res.json({
            success: true,
            message: "Transaction deleted successfully.",
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
    const filter = {
      transactionDate: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
      status: { $in: ["approved", "completed"] },
    };
    if (String(req.user?.role || "").toLowerCase() === "member") filter.member = req.user._id;

    const rows = await Finance.find(filter)
      .populate("member", "fullName memberNumber")
      .populate("approvedBy", "fullName")
      .sort({ transactionDate: 1, createdAt: 1 })
      .lean();

    let balance = 0;
    const creditTypes = new Set(["contribution", "income", "refund"]);
    const entries = rows.map((row) => {
      const credit = creditTypes.has(row.type) ? Number(row.amount || 0) : 0;
      const debit = credit ? 0 : Number(row.amount || 0);
      balance += credit - debit;
      return {
        ...row,
        employeeNumber: row.member?.memberNumber || "",
        debit,
        credit,
        runningBalance: balance,
      };
    });

    const totals = entries.reduce((acc, row) => ({
      credit: acc.credit + row.credit,
      debit: acc.debit + row.debit,
    }), { credit: 0, debit: 0 });

    return res.json({
      success: true,
      year,
      entries,
      totals: { ...totals, balance: totals.credit - totals.debit },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
/* =====================================================
   FINANCE DASHBOARD SUMMARY
===================================================== */

exports.getFinanceSummary = async (req, res) => {

    try {

        const transactions = await Finance.find();

        let totalIncome = 0;
        let totalExpenses = 0;
        let totalContributions = 0;
        let totalClaims = 0;

        transactions.forEach(transaction => {

            switch (transaction.type) {

                case "income":
                    totalIncome += transaction.amount;
                    break;

                case "expense":
                    totalExpenses += transaction.amount;
                    break;

                case "contribution":
                    totalContributions += transaction.amount;
                    break;

                case "claim":
                    totalClaims += transaction.amount;
                    break;

            }

        });

        res.json({

            success: true,

            summary: {

                totalTransactions: transactions.length,

                totalIncome,

                totalExpenses,

                totalContributions,

                totalClaims,

                balance:
                    totalIncome +
                    totalContributions -
                    totalExpenses -
                    totalClaims

            }

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



exports.getMemberAccounts = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);
    const month = Number(req.query.month) || new Date().getMonth() + 1;

    const [activeMembers, contributions, transactions, medical, funeral, education] = await Promise.all([
      Member.countDocuments({ role: "member", status: "active", isDeleted: false }),
      Contribution.find({ year }).sort({ year: -1, month: -1, paymentDate: -1, createdAt: -1 }).lean(),
      Finance.find({ transactionDate: { $gte: yearStart, $lt: yearEnd }, status: { $in: ["approved", "completed"] } })
        .sort({ transactionDate: -1, createdAt: -1 }).lean(),
      require("../models/MedicalSupport").find({ isDeleted: { $ne: true } }).select("status approvedAmount requestedAmount").lean(),
      require("../models/FuneralSupport").find({}).select("status approvedAmount requestedAmount").lean(),
      require("../models/EducationSupport").find({}).select("status approvedAmount requestedAmount").lean(),
    ]);

    const schemeContributions = contributions.filter((item) => Number(item.year) === year);
    const totalExpected = schemeContributions.reduce((sum, item) => sum + Number(item.expectedAmount || 0), 0);
    const totalCollected = schemeContributions.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
    const outstanding = schemeContributions.reduce((sum, item) => sum + Math.max(0, Number(item.expectedAmount || 0) - Number(item.paidAmount || 0)), 0);
    const monthly = Array.from({ length: 12 }, (_, index) => {
      const m = index + 1;
      const rows = schemeContributions.filter((item) => Number(item.month) === m);
      return {
        month: m,
        expected: rows.reduce((sum, item) => sum + Number(item.expectedAmount || 0), 0),
        collected: rows.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
        outstanding: rows.reduce((sum, item) => sum + Math.max(0, Number(item.expectedAmount || 0) - Number(item.paidAmount || 0)), 0),
        membersCharged: new Set(rows.map((item) => String(item.member))).size,
      };
    });

    const currentMonthRows = schemeContributions.filter((item) => Number(item.month) === month);
    const deductionCounts = currentMonthRows.reduce((map, item) => { const value = Number(item.expectedAmount || 0); if (value > 0) map.set(value, (map.get(value) || 0) + 1); return map; }, new Map());
    const standardMonthlyDeduction = [...deductionCounts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] || 500;

    const creditTypes = new Set(["contribution", "income", "refund"]);
    const groupedLedger = new Map();
    for (const row of transactions) {
      const dateValue = row.transactionDate || row.createdAt;
      const day = dateValue ? new Date(dateValue).toISOString().slice(0, 10) : "unknown";
      const type = String(row.type || "other");
      const category = String(row.category || "scheme activity");
      const key = `${day}|${type}|${category}`;
      const amount = Number(row.amount || 0);
      const existing = groupedLedger.get(key) || { date: dateValue, type, category, totalAmount: 0, count: 0 };
      existing.totalAmount += amount;
      existing.count += 1;
      groupedLedger.set(key, existing);
    }
    let balance = 0;
    const ledgerEntries = [...groupedLedger.values()].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).map((row) => {
      const credit = creditTypes.has(row.type) ? row.totalAmount : 0;
      const debit = credit ? 0 : row.totalAmount;
      balance += credit - debit;
      return {
        date: row.date,
        type: row.type,
        category: row.category,
        description: `Scheme ${row.type} activity (${row.count} record${row.count === 1 ? "" : "s"})`,
        amount: row.totalAmount,
        debit,
        credit,
        runningBalance: balance,
      };
    });

    const supportRows = [...medical, ...funeral, ...education];
    const approvedStatuses = new Set(["Approved", "Paid", "Disbursed", "Completed", "Closed"]);
    const pendingStatuses = new Set(["Pending", "Under Review"]);
    const approvedSupportTotal = supportRows.reduce((sum, item) => sum + (approvedStatuses.has(item.status) ? Number(item.approvedAmount || 0) : 0), 0);
    const pendingSupportTotal = supportRows.filter((item) => pendingStatuses.has(item.status)).length;

    return res.json({
      success: true,
      scope: "scheme-wide",
      year,
      month,
      standardMonthlyDeduction,
      activeMembers,
      monthly,
      totals: {
        totalExpected,
        totalCollected,
        outstanding,
        membersCharged: new Set(schemeContributions.map((item) => String(item.member))).size,
        approvedSupportTotal,
        pendingSupportCases: pendingSupportTotal,
        ledgerBalance: balance,
        ledgerCredits: ledgerEntries.reduce((sum, item) => sum + item.credit, 0),
        ledgerDebits: ledgerEntries.reduce((sum, item) => sum + item.debit, 0),
      },
      ledger: {
        entries: ledgerEntries.slice(0, 100),
        totals: {
          credit: ledgerEntries.reduce((sum, item) => sum + item.credit, 0),
          debit: ledgerEntries.reduce((sum, item) => sum + item.debit, 0),
          balance,
        },
      },
      support: {
        totalCases: supportRows.length,
        approvedCases: supportRows.filter((item) => approvedStatuses.has(item.status)).length,
        pendingCases: pendingSupportTotal,
        approvedSupportTotal,
      },
      notice: "General scheme account view.",
    });
  } catch (error) {
    console.error("Scheme-wide member accounts error:", error);
    res.status(500).json({ success: false, message: error.message || "Unable to load scheme accounts." });
  }
};

