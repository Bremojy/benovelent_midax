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
      employeeNumber,
      month,
      year,
      expectedAmount,
      paidAmount = 0,
      paymentMethod,
      receiptNumber,
      mpesaCode,
      paymentDate,
      notes,
    } = req.body || {};

    if (!month || !year || expectedAmount == null) {
      return res.status(400).json({
        success: false,
        message: "Month, year and expected amount are required.",
      });
    }

    let memberId = member || null;
    if (!memberId && employeeNumber) {
      const found = await Member.findOne({ memberNumber: String(employeeNumber).trim() }).select("_id").lean();
      memberId = found?._id || null;
    }
    if (!memberId) {
      return res.status(400).json({ success: false, message: "Employee number is required." });
    }

    const memberExists = await Member.exists({ _id: memberId });
    if (!memberExists) {
      return res.status(404).json({ success: false, message: "Employee number not found." });
    }

    const exists = await Contribution.findOne({ member: memberId, month, year });
    if (exists) {
      return res.status(400).json({ success: false, message: "Contribution for this month already exists." });
    }

    const contribution = await Contribution.create({
      member: memberId,
      month,
      year,
      expectedAmount: Number(expectedAmount),
      paidAmount: Number(paidAmount || 0),
      paymentMethod,
      receiptNumber,
      mpesaCode,
      paymentDate,
      notes,
    });

    if (Number(paidAmount || 0) > 0) {
      const finance = await Finance.create({
        member: memberId,
        transactionNumber: `TRX-${Date.now()}`,
        type: "contribution",
        category: "Monthly Contribution",
        amount: Number(paidAmount),
        paymentMethod,
        receiptNumber,
        referenceNumber: mpesaCode,
        description: `Contribution ${month}/${year}`,
        status: "approved",
        approvedBy: req.user._id,
        approvedAt: new Date(),
      });
      contribution.finance = finance._id;
      await contribution.save();
    }

    await Notification.create({
      recipient: memberId,
      recipientModel: "Member",
      sender: req.user._id,
      senderModel: String(req.user.role || "admin") === "superadmin" ? "SuperAdmin" : "Admin",
      title: "Contribution Recorded",
      message: `Your contribution for ${month}/${year} has been recorded.`,
      type: "contribution",
      referenceId: contribution._id,
      referenceModel: "Contribution",
    });

    return res.status(201).json({
      success: true,
      message: "Contribution created successfully.",
      contribution,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


/* =====================================================
   BULK PAYROLL CONTRIBUTION RUN
   Records the same approved monthly deduction for all active members.
===================================================== */
exports.createBulkContributionRun = async (req, res) => {
  try {
    const month = Number(req.body?.month);
    const year = Number(req.body?.year) || new Date().getFullYear();
    const amount = Number(req.body?.amount);
    const paymentDate = req.body?.paymentDate ? new Date(req.body.paymentDate) : new Date();
    const recordAsCollected = req.body?.recordAsCollected !== false;
    const paymentMethod = "Payroll";
    const notes = String(req.body?.notes || "Monthly payroll deduction").trim();

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "A valid contribution month is required." });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "A positive monthly contribution amount is required." });
    }
    if (Number.isNaN(paymentDate.getTime())) {
      return res.status(400).json({ success: false, message: "A valid payment date is required." });
    }

    const members = await Member.find({ role: "member", status: "active", isDeleted: false })
      .select("_id fullName memberNumber")
      .lean();

    if (!members.length) {
      return res.status(400).json({ success: false, message: "No active members are available for the contribution run." });
    }

    let created = 0;
    let updated = 0;
    let collected = 0;
    const failures = [];

    for (const member of members) {
      try {
        const paidAmount = recordAsCollected ? amount : 0;
        let contribution = await Contribution.findOne({ member: member._id, month, year });

        if (!contribution) {
          contribution = new Contribution({
            member: member._id,
            month,
            year,
            expectedAmount: amount,
            paidAmount,
            paymentMethod,
            paymentDate: recordAsCollected ? paymentDate : undefined,
            notes,
            approvedBy: req.user._id,
            approvedAt: new Date(),
          });
          await contribution.save();
          created += 1;
        } else {
          contribution.expectedAmount = amount;
          contribution.paymentMethod = paymentMethod;
          contribution.notes = notes;
          contribution.approvedBy = req.user._id;
          contribution.approvedAt = new Date();
          if (recordAsCollected) {
            contribution.paidAmount = amount;
            contribution.paymentDate = paymentDate;
          } else if (Number(contribution.paidAmount || 0) === 0) {
            contribution.paidAmount = 0;
          }
          await contribution.save();
          updated += 1;
        }

        // Keep the financial ledger in sync with the contribution record.
        if (recordAsCollected) {
          let finance = contribution.finance
            ? await Finance.findById(contribution.finance)
            : await Finance.findOne({ member: member._id, type: "contribution", category: "Monthly Payroll Contribution", transactionDate: { $gte: new Date(year, month - 1, 1), $lt: new Date(year, month, 1) } }).sort({ createdAt: -1 });

          if (!finance) {
            finance = await Finance.create({
              member: member._id,
              transactionNumber: `PAYROLL-${year}${String(month).padStart(2, "0")}-${member.memberNumber}-${Date.now()}`,
              type: "contribution",
              category: "Monthly Payroll Contribution",
              amount,
              description: `Payroll contribution ${month}/${year}`,
              paymentMethod,
              transactionDate: paymentDate,
              status: "approved",
              approvedBy: req.user._id,
              approvedAt: new Date(),
              notes,
            });
          } else {
            finance.amount = amount;
            finance.paymentMethod = paymentMethod;
            finance.transactionDate = paymentDate;
            finance.description = `Payroll contribution ${month}/${year}`;
            finance.notes = notes;
            finance.status = "approved";
            finance.approvedBy = req.user._id;
            finance.approvedAt = new Date();
            await finance.save();
          }
          contribution.finance = finance._id;
          await contribution.save();
          collected += 1;
        }
      } catch (memberError) {
        failures.push({ memberNumber: member.memberNumber, name: member.fullName, message: memberError.message });
      }
    }

    // Keep the shared member profile field aligned as a display fallback only.
    await Member.updateMany({ role: "member", isDeleted: false }, { $set: { monthlyContribution: amount } });

    return res.status(201).json({
      success: true,
      message: `Payroll contribution run completed for ${members.length} active members.`,
      run: { month, year, amount, paymentMethod, recordAsCollected, totalMembers: members.length, created, updated, collected, failed: failures.length },
      failures,
    });
  } catch (error) {
    console.error("Bulk contribution run error:", error);
    return res.status(500).json({ success: false, message: error.message || "Unable to complete bulk contribution run." });
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

            paymentDate: -1,
            year: -1,
            month: -1,
            createdAt: -1

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

        const requestedMemberId = req.params.memberId || req.user?._id || null;
        const member = requestedMemberId
            ? await Member.findById(requestedMemberId).select("monthlyContribution").lean()
            : null;

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
        const isMemberRole = String(req.user?.role || '').toLowerCase() === 'member';
        if (isMemberRole) {
            const currentYear = Number(req.query.year) || new Date().getFullYear();
            const rows = await Contribution.find({ year: currentYear }).lean();
            const monthly = Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const monthRows = rows.filter((item) => Number(item.month) === month);
                return {
                    month,
                    expected: monthRows.reduce((sum, item) => sum + Number(item.expectedAmount || 0), 0),
                    collected: monthRows.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
                    membersCharged: new Set(monthRows.map((item) => String(item.member))).size,
                };
            });
            return res.json({
                success: true,
                scope: 'scheme-wide',
                year: currentYear,
                count: rows.length,
                monthly,
                summary: {
                    totalExpected: rows.reduce((sum, item) => sum + Number(item.expectedAmount || 0), 0),
                    totalCollected: rows.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
                },
                notice: 'Individual member contribution records are not displayed to members.'
            });
        }

        const requestedMemberId = req.params.memberId || req.user._id;
        const contributions=await Contribution.find({ member: requestedMemberId })
            .populate('finance')
            .sort({ paymentDate: -1, year: -1, month: -1, createdAt: -1 });
        res.json({ success:true, count:contributions.length, contributions });
    } catch(error){
        console.error(error);
        res.status(500).json({ success:false, message:error.message });
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

        // Keep the linked finance ledger entry synchronized with the
        // contribution record. A contribution and its finance transaction
        // represent one accounting event in this application.
        if (contribution.finance) {
            const finance = await Finance.findById(contribution.finance);
            if (finance) {
                finance.member = contribution.member;
                finance.type = "contribution";
                finance.category = finance.category || "Monthly Contribution";
                finance.amount = Number(contribution.paidAmount || 0);
                finance.paymentMethod = contribution.paymentMethod || finance.paymentMethod;
                finance.receiptNumber = contribution.receiptNumber || "";
                finance.referenceNumber = contribution.mpesaCode || "";
                finance.transactionDate = contribution.paymentDate || finance.transactionDate;
                finance.description = `Contribution ${contribution.month}/${contribution.year}`;
                finance.notes = contribution.notes || "";
                await finance.save();
            }
        } else if (Number(contribution.paidAmount || 0) > 0) {
            const finance = await Finance.create({
                member: contribution.member,
                transactionNumber: `TRX-${Date.now()}-${String(contribution._id).slice(-6)}`,
                type: "contribution",
                category: "Monthly Contribution",
                amount: Number(contribution.paidAmount || 0),
                paymentMethod: contribution.paymentMethod || "M-PESA",
                receiptNumber: contribution.receiptNumber || "",
                referenceNumber: contribution.mpesaCode || "",
                description: `Contribution ${contribution.month}/${contribution.year}`,
                transactionDate: contribution.paymentDate || new Date(),
                status: "approved",
                approvedBy: req.user._id,
                approvedAt: new Date(),
                notes: contribution.notes || "",
            });
            contribution.finance = finance._id;
            await contribution.save();
        }

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

