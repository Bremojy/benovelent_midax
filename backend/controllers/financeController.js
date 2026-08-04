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

        const {

            member,

            type,

            category,

            amount,

            description,

            paymentMethod,

            referenceNumber,

            receiptNumber,

            notes

        } = req.body;

        if (!member || !type || !amount) {

            return res.status(400).json({

                success: false,

                message: "Member, type and amount are required."

            });

        }

        const memberExists = await Member.findById(member);

        if (!memberExists) {

            return res.status(404).json({

                success: false,

                message: "Member not found."

            });

        }

        const transaction = await Finance.create({

            member,

            transactionNumber:
                generateTransactionNumber(),

            type,

            category,

            amount,

            description,

            paymentMethod,

            referenceNumber,

            receiptNumber,

            notes,

            status: "pending"

        });

        await Notification.create({

            recipient: member,

            sender: req.user._id,

            title: "Finance Update",

            message:
                `A ${type} transaction of KSh ${amount} has been created.`,

            type: "finance",

            referenceId: transaction._id,

            referenceModel: "Finance"

        });

        res.status(201).json({

            success: true,

            message: "Transaction created successfully.",

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

                transactionDate: -1

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
            "notes"
        ];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                transaction[field] = req.body[field];
            }
        });

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

            transactionDate: -1

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
    const [transactions, contributions, yearContributions, member, medical, funeral, education, allMedical, allFuneral, allEducation] = await Promise.all([
      Finance.find({ member: memberId }).sort({ transactionDate: -1 }).lean(),
      Contribution.find({ member: memberId, year }).sort({ month: 1 }).lean(),
      Contribution.find({ year }).lean(),
      Member.findById(memberId).select("fullName memberNumber").lean(),
      require("../models/MedicalSupport").find({ member: memberId }).select("status approvedAmount requestedAmount").lean(),
      require("../models/FuneralSupport").find({ member: memberId }).select("status approvedAmount requestedAmount").lean(),
      require("../models/EducationSupport").find({ member: memberId }).select("status approvedAmount requestedAmount").lean(),
      require("../models/MedicalSupport").find({}).select("status").lean(),
      require("../models/FuneralSupport").find({}).select("status").lean(),
      require("../models/EducationSupport").find({}).select("status").lean(),
    ]);
    const monthly = Array.from({length:12}, (_,i) => {
      const month=i+1; const rows=yearContributions.filter(c=>Number(c.month)===month && Number(c.paidAmount||0)>0);
      return {month, contributed:rows.reduce((a,c)=>a+Number(c.paidAmount||0),0), contributingMembers:new Set(rows.map(c=>String(c.member))).size};
    });
    const claims=[...medical,...funeral,...education];
    const allCases=[...allMedical,...allFuneral,...allEducation];
    const ledgerBalance=transactions.reduce((sum,t)=>sum + ((t.type==="contribution"||t.type==="income")?Number(t.amount||0):-Number(t.amount||0)),0);
    res.json({success:true,member,year,transactions,monthly,totals:{contributedThisYear:contributions.reduce((a,c)=>a+Number(c.paidAmount||0),0),ledgerBalance,totalCasesHelped:allCases.filter(c=>["Approved","Paid","Disbursed","Completed","Closed"].includes(c.status)).length,pendingClaims:claims.filter(c=>["Pending","Under Review"].includes(c.status)).length}});
  } catch(error){res.status(500).json({success:false,message:error.message});}
};
