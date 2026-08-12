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
            return res.status(400).json({ success: false, message: "Employee number is required for this transaction type." });
        }
        if (memberId && !await Member.exists({ _id: memberId })) {
            return res.status(404).json({ success: false, message: "Employee number not found." });
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
                if (!member) return res.status(404).json({ success: false, message: "Employee number not found." });
                transaction.member = member._id;
            } else if (["contribution", "claim", "refund"].includes(transaction.type)) {
                return res.status(400).json({ success: false, message: "Employee number is required for this transaction type." });
            } else {
                transaction.member = null;
            }
        }

        await transaction.save();

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
   DELETE TRANSACTION
===================================================== */

exports.deleteTransaction = async (req, res) => {

    try {

        const transaction = await Finance.findById(req.params.id);

        if (!transaction) {

            return res.status(404).json({

                success: false,

                message: "Transaction not found."

            });

        }

        await transaction.deleteOne();

        res.json({

            success: true,

            message: "Transaction deleted successfully."

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
    const memberId = req.user._id;
    const year = Number(req.query.year) || new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);
    const [transactions, contributions, member, medical, funeral, education] = await Promise.all([
      Finance.find({ member: memberId, transactionDate: { $gte: yearStart, $lt: yearEnd }, status: { $in: ["approved", "completed"] } }).sort({ transactionDate: -1, createdAt: -1 }).lean(),
      Contribution.find({ member: memberId, year }).sort({ paymentDate: -1, year: -1, month: -1, createdAt: -1 }).lean(),
      Member.findById(memberId).select("fullName memberNumber").lean(),
      require("../models/MedicalSupport").find({ member: memberId }).select("status approvedAmount requestedAmount").lean(),
      require("../models/FuneralSupport").find({ member: memberId }).select("status approvedAmount requestedAmount").lean(),
      require("../models/EducationSupport").find({ member: memberId }).select("status approvedAmount requestedAmount").lean(),
    ]);
    const monthly = Array.from({length:12}, (_,i) => {
      const month=i+1; const rows=contributions.filter(c=>Number(c.month)===month && Number(c.paidAmount||0)>0);
      return {month, contributed:rows.reduce((a,c)=>a+Number(c.paidAmount||0),0), contributingMembers:rows.length > 0 ? 1 : 0};
    });
    const claims=[...medical,...funeral,...education];
    const ledgerBalance=transactions.reduce((sum,t)=>sum + ((["contribution","income","refund"].includes(t.type))?Number(t.amount||0):-Number(t.amount||0)),0);
    const supportCases = [
      ...funeral.map((item) => ({
        id: String(item._id),
        supportType: "funeral",
        status: item.status,
        requestedAmount: Number(item.requestedAmount || 0),
        approvedAmount: Number(item.approvedAmount || 0),
      })),
      ...medical.map((item) => ({
        id: String(item._id),
        supportType: "medical",
        status: item.status,
        requestedAmount: Number(item.requestedAmount || 0),
        approvedAmount: Number(item.approvedAmount || 0),
      })),
      ...education.map((item) => ({
        id: String(item._id),
        supportType: "education",
        status: item.status,
        requestedAmount: Number(item.requestedAmount || 0),
        approvedAmount: Number(item.approvedAmount || 0),
      })),
    ].sort((a, b) => String(b.id).localeCompare(String(a.id)));
    const approvedSupportTotal = supportCases.reduce((sum, item) =>
      sum + (["Approved","Paid","Disbursed","Completed","Closed"].includes(item.status) ? Number(item.approvedAmount || 0) : 0), 0);
    res.json({success:true,member,year,transactions,monthly,supportCases,totals:{contributedThisYear:contributions.reduce((a,c)=>a+Number(c.paidAmount||0),0),ledgerBalance,totalCasesHelped:claims.filter(c=>["Approved","Paid","Disbursed","Completed","Closed"].includes(c.status)).length,pendingClaims:claims.filter(c=>["Pending","Under Review"].includes(c.status)).length,approvedSupportTotal}});
  } catch(error){res.status(500).json({success:false,message:error.message});}
};
