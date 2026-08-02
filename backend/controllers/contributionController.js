const Contribution = require("../models/Contribution");
const Finance = require("../models/Finance");
const Member = require("../models/Member");
const Notification = require("../models/Notification");

/* =====================================================
   CREATE CONTRIBUTION
===================================================== */

exports.createContribution = async (req, res) => {

    try {

        const {

            member,

            month,

            year,

            expectedAmount,

            paidAmount,

            paymentMethod,

            receiptNumber,

            mpesaCode,

            paymentDate,

            notes

        } = req.body;

        if (

            !member ||

            !month ||

            !year ||

            expectedAmount == null

        ) {

            return res.status(400).json({

                success:false,

                message:"Member, month, year and expected amount are required."

            });

        }

        const memberExists = await Member.findById(member);

        if(!memberExists){

            return res.status(404).json({

                success:false,

                message:"Member not found."

            });

        }

        const exists = await Contribution.findOne({

            member,

            month,

            year

        });

        if(exists){

            return res.status(400).json({

                success:false,

                message:"Contribution for this month already exists."

            });

        }

        const contribution = await Contribution.create({

            member,

            month,

            year,

            expectedAmount,

            paidAmount:paidAmount || 0,

            paymentMethod,

            receiptNumber,

            mpesaCode,

            paymentDate,

            notes

        });

        if((paidAmount || 0) > 0){

            const finance = await Finance.create({

                member,

                transactionNumber:`TRX-${Date.now()}`,

                type:"contribution",

                category:"Monthly Contribution",

                amount:paidAmount,

                paymentMethod,

                receiptNumber,

                referenceNumber:mpesaCode,

                description:`Contribution ${month}/${year}`,

                status:"approved",

                approvedBy:req.user._id,

                approvedAt:new Date()

            });

            contribution.finance = finance._id;

            await contribution.save();

        }

        await Notification.create({

            recipient:member,

            sender:req.user._id,

            title:"Contribution Recorded",

            message:`Your contribution for ${month}/${year} has been recorded.`,

            type:"contribution",

            referenceId:contribution._id,

            referenceModel:"Contribution"

        });

        res.status(201).json({

            success:true,

            message:"Contribution created successfully.",

            contribution

        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



/* =====================================================
   GET ALL CONTRIBUTIONS
===================================================== */

exports.getContributions = async (req,res)=>{

    try{

        const filter={};

        if(req.query.month){

            filter.month=Number(req.query.month);

        }

        if(req.query.year){

            filter.year=Number(req.query.year);

        }

        if(req.query.status){

            filter.status=req.query.status;

        }

        const contributions=await Contribution.find(filter)

        .populate(

            "member",

            "fullName memberNumber profileImage"

        )

        .populate(

            "approvedBy",

            "fullName"

        )

        .sort({

            year:-1,

            month:-1,

            createdAt:-1

        });

        const totalContributed = contributions.reduce(
            (sum, item) => sum + Number(item.paidAmount || item.amount || 0),
            0
        );

        const outstanding = contributions.reduce(
            (sum, item) =>
                sum + Math.max(0, Number(item.expectedAmount || 0) - Number(item.paidAmount || 0)),
            0
        );

        const currentYear = new Date().getFullYear();
        const currentYearTotal = contributions
            .filter(item => Number(item.year) === currentYear)
            .reduce((sum, item) => sum + Number(item.paidAmount || item.amount || 0), 0);

        const member = await Member.findById(requestedMemberId).select("monthlyContribution").lean();

        res.json({
            success:true,
            count:contributions.length,
            summary: {
                monthlyContribution: Number(member?.monthlyContribution || 0),
                totalContributed,
                currentYear: currentYearTotal,
                outstanding,
            },
            contributions
        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};



/* =====================================================
   GET MEMBER CONTRIBUTIONS
===================================================== */

exports.getMemberContributions = async (req,res)=>{

    try{

        const requestedMemberId = req.params.memberId || req.user._id;

        if (req.user?.role === "member" && String(requestedMemberId) !== String(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You can only view your own contributions."
            });
        }

        const contributions=await Contribution.find({

            member:requestedMemberId

        })

        .populate(

            "finance"

        )

        .sort({

            year:-1,

            month:-1

        });

        res.json({

            success:true,

            count:contributions.length,

            contributions

        });

    }

    catch(error){

        console.error(error);

        res.status(500).json({

            success:false,

            message:error.message

        });

    }

};
/* =====================================================
   UPDATE CONTRIBUTION
===================================================== */

exports.updateContribution = async (req, res) => {

    try {

        const contribution = await Contribution.findById(req.params.id);

        if (!contribution) {

            return res.status(404).json({
                success: false,
                message: "Contribution not found."
            });

        }

        const fields = [

            "expectedAmount",

            "paidAmount",

            "paymentMethod",

            "receiptNumber",

            "mpesaCode",

            "paymentDate",

            "notes"

        ];

        fields.forEach(field => {

            if (req.body[field] !== undefined) {

                contribution[field] = req.body[field];

            }

        });

        await contribution.save();

        res.json({

            success: true,

            message: "Contribution updated successfully.",

            contribution

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
   DELETE CONTRIBUTION
===================================================== */

exports.deleteContribution = async (req, res) => {

    try {

        const contribution = await Contribution.findById(req.params.id);

        if (!contribution) {

            return res.status(404).json({

                success: false,

                message: "Contribution not found."

            });

        }

        if (contribution.finance) {

            await Finance.findByIdAndDelete(contribution.finance);

        }

        await contribution.deleteOne();

        res.json({

            success: true,

            message: "Contribution deleted successfully."

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
   APPROVE CONTRIBUTION
===================================================== */

exports.approveContribution = async (req, res) => {

    try {

        const contribution = await Contribution.findById(req.params.id);

        if (!contribution) {

            return res.status(404).json({

                success: false,

                message: "Contribution not found."

            });

        }

        contribution.approvedBy = req.user._id;

        contribution.approvedAt = new Date();

        await contribution.save();

        await Notification.create({

            recipient: contribution.member,

            sender: req.user._id,

            title: "Contribution Approved",

            message: `Your contribution for ${contribution.month}/${contribution.year} has been approved.`,

            type: "contribution",

            referenceId: contribution._id,

            referenceModel: "Contribution"

        });

        res.json({

            success: true,

            message: "Contribution approved successfully.",

            contribution

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
   REJECT CONTRIBUTION
===================================================== */

exports.rejectContribution = async (req, res) => {

    try {

        const contribution = await Contribution.findById(req.params.id);

        if (!contribution) {

            return res.status(404).json({

                success: false,

                message: "Contribution not found."

            });

        }

        contribution.status = "pending";

        contribution.approvedBy = req.user._id;

        contribution.approvedAt = new Date();

        await contribution.save();

        await Notification.create({

            recipient: contribution.member,

            sender: req.user._id,

            title: "Contribution Update",

            message: `Your contribution for ${contribution.month}/${contribution.year} requires review.`,

            type: "contribution",

            referenceId: contribution._id,

            referenceModel: "Contribution"

        });

        res.json({

            success: true,

            message: "Contribution sent back for review.",

            contribution

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
   MEMBER CONTRIBUTION SUMMARY
===================================================== */

exports.getMemberContributionSummary = async (req, res) => {

    try {

        const contributions = await Contribution.find({

            member: req.params.memberId

        });

        const summary = {

            totalExpected: 0,

            totalPaid: 0,

            totalBalance: 0,

            paidMonths: 0,

            pendingMonths: 0,

            overdueMonths: 0

        };

        contributions.forEach(item => {

            summary.totalExpected += item.expectedAmount;

            summary.totalPaid += item.paidAmount;

            summary.totalBalance += item.balance;

            if (item.status === "paid") summary.paidMonths++;

            if (item.status === "pending" || item.status === "partial")
                summary.pendingMonths++;

            if (item.status === "overdue")
                summary.overdueMonths++;

        });

        res.json({

            success: true,

            summary

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
   CONTRIBUTION DASHBOARD
===================================================== */
exports.getContributionSummary = async (req, res) => {

    try {

        const contributions = await Contribution.find();

        const dashboard = {

            totalContributions: contributions.length,

            totalExpected: 0,

            totalCollected: 0,

            totalOutstanding: 0,

            paid: 0,

            partial: 0,

            pending: 0,

            overdue: 0

        };

        contributions.forEach(item => {

            dashboard.totalExpected += item.expectedAmount;
            dashboard.totalCollected += item.paidAmount;
            dashboard.totalOutstanding += item.balance;

            switch (item.status) {

                case "paid":
                    dashboard.paid++;
                    break;

                case "partial":
                    dashboard.partial++;
                    break;

                case "pending":
                    dashboard.pending++;
                    break;

                case "overdue":
                    dashboard.overdue++;
                    break;

            }

        });

        res.json({

            success: true,

            dashboard

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
   COMPATIBILITY EXPORTS
===================================================== */

// Get one contribution
exports.getContribution = async (req, res) => {
    try {
        const contribution = await Contribution.findById(req.params.id)
            .populate("member")
            .populate("finance");

        if (!contribution) {
            return res.status(404).json({
                success: false,
                message: "Contribution not found."
            });
        }

        res.json({
            success: true,
            contribution
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

