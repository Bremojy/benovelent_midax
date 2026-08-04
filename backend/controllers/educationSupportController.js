const EducationSupport = require("../models/EducationSupport");
const Member = require("../models/Member");
const Dependent = require("../models/Dependent");
const createNotification =
require("../utils/createNotification");

// ======================================================
// APPLY FOR EDUCATION SUPPORT
// POST /api/education/apply
// ======================================================

exports.applyEducationSupport = async (req, res) => {
  try {
    const {
      dependentId,
      purpose,
      requestedAmount,
      repaymentPeriodMonths,
      feeStructure,
      admissionLetter,
      supportingDocuments,
    } = req.body;

    // =====================================
    // MEMBER
    // =====================================

    const member = await Member.findById(req.user._id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found.",
      });
    }

    // =====================================
    // DEPENDENT
    // =====================================

    const dependent = await Dependent.findOne({
      _id: dependentId,
      member: member._id,
      active: true,
    });

    if (!dependent) {
      return res.status(404).json({
        success: false,
        message: "Dependent not found.",
      });
    }

    // =====================================
    // VALIDATE PURPOSE
    // =====================================

    if (!purpose || purpose.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Purpose is required.",
      });
    }

    // =====================================
    // VALIDATE AMOUNT
    // =====================================

    if (!requestedAmount || requestedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid requested amount.",
      });
    }

    if (requestedAmount > 20000) {
      return res.status(400).json({
        success: false,
        message:
          "Maximum Education Support amount is KSh 20,000.",
      });
    }

    // =====================================
    // EXISTING ACTIVE LOAN
    // =====================================

    const activeLoan =
      await EducationSupport.findOne({
        member: member._id,
        status: {
          $in: [
            "Pending",
            "Approved",
            "Disbursed",
          ],
        },
      });

    if (activeLoan) {
      return res.status(400).json({
        success: false,
        message:
          "You already have an active Education Support application.",
      });
    }

    // =====================================
    // MONTHLY APPROVAL LIMIT
    // =====================================

    const now = new Date();

    const firstDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    const monthlyApproved =
      await EducationSupport.countDocuments({
        status: "Approved",
        approvalDate: {
          $gte: firstDay,
          $lte: lastDay,
        },
      });

    if (monthlyApproved >= 4) {
      return res.status(400).json({
        success: false,
        message:
          "Monthly Education Support limit has been reached.",
      });
    }

    // =====================================
    // LOCAL DOCUMENT UPLOADS
    // =====================================

    const fileUrl = (file) =>
      file ? `/${req.uploadType === "documents" ? "documents" : "uploads/" + (req.uploadType || "support")}/${file.filename}` : "";

    const feeStructureFile = req.files?.feeStructure?.[0];
    const admissionLetterFile = req.files?.admissionLetter?.[0];
    const supportingFiles = (req.files?.supportingDocuments || []).map(
      file => fileUrl(file)
    );

    // =====================================
    // CREATE APPLICATION
    // =====================================

    const application =
      await EducationSupport.create({
        member: member._id,
        memberNumber: member.memberNumber,
        contributorName: member.fullName,

        dependent: dependent._id,
        dependentName: dependent.fullName,
        relationship: dependent.relationship,

        school: dependent.school,
        admissionNumber:
          dependent.admissionNumber,
        educationLevel:
          dependent.educationLevel,

        purpose,

        requestedAmount,

        repaymentPeriodMonths:
          repaymentPeriodMonths || 12,

        feeStructure: fileUrl(feeStructureFile) || feeStructure,

        admissionLetter: fileUrl(admissionLetterFile) || admissionLetter,

        supportingDocuments: [
          ...(Array.isArray(supportingDocuments) ? supportingDocuments : []),
          ...supportingFiles,
        ].filter(Boolean),

        createdBy: member._id,
      });

    const Admin = require("../models/Admin");

const admins = await Admin.find().select("_id");

for (const admin of admins) {
await createNotification({

    recipient: admin._id,

    recipientModel: "Admin",

    sender: member._id,

    senderModel: "Member",

    title: "New Education Support Application",

    message:
        `${member.fullName} has submitted an Education Support application.`,

    type: "education",

    referenceId: application._id,

    referenceModel: "EducationSupport",

    icon: "school",

});
}

    res.status(201).json({
      success: true,
      message:
        "Education Support application submitted successfully.",
      application,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ======================================================
// GET MY EDUCATION SUPPORT APPLICATIONS
// GET /api/education/my-applications
// ======================================================

exports.getMyApplications = async (req, res) => {
  try {
    const applications = await EducationSupport.find({
      member: req.user._id,
    })
      .populate(
        "dependent",
        "fullName relationship school educationLevel"
      )
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      total: applications.length,
      applications,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================================================
// GET SINGLE APPLICATION
// GET /api/education/:id
// ======================================================

exports.getApplicationById = async (req, res) => {
  try {
    const application =
      await EducationSupport.findById(req.params.id)
        .populate(
          "member",
          "memberNumber fullName email phone"
        )
        .populate(
          "dependent",
          "fullName relationship school admissionNumber educationLevel"
        )
        .populate(
          "approvedBy",
          "fullName"
        );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    const isOwner =
      application.member._id.toString() ===
      req.user._id.toString();

    const isAdmin =
      req.user.role === "admin" ||
      req.user.role === "superadmin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    res.json({
      success: true,
      application,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ======================================================
// GET ALL APPLICATIONS (ADMIN)
// GET /api/education
// ======================================================

exports.getAllApplications = async (req, res) => {

  try {

    const page =
      Number(req.query.page) || 1;

    const limit =
      Number(req.query.limit) || 10;

    const skip =
      (page - 1) * limit;

    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.memberNumber) {
      filter.memberNumber = {
        $regex: req.query.memberNumber,
        $options: "i",
      };
    }

    if (req.query.school) {
      filter.school = {
        $regex: req.query.school,
        $options: "i",
      };
    }

    const total =
      await EducationSupport.countDocuments(
        filter
      );

    const applications =
      await EducationSupport.find(filter)
        .populate(
          "member",
          "memberNumber fullName"
        )
        .populate(
          "dependent",
          "fullName relationship"
        )
        .populate(
          "approvedBy",
          "fullName"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit);

    res.json({

      success: true,

      pagination: {

        total,

        page,

        pages: Math.ceil(total / limit),

        limit,

      },

      applications,

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

// ======================================================
// GET DASHBOARD SUMMARY (ADMIN)
// GET /api/education/dashboard
// ======================================================

exports.getEducationSummary = async (req, res) => {

  try {

    const pending =
      await EducationSupport.countDocuments({
        status: "Pending",
      });

    const approved =
      await EducationSupport.countDocuments({
        status: "Approved",
      });

    const disbursed =
      await EducationSupport.countDocuments({
        status: "Disbursed",
      });

    const completed =
      await EducationSupport.countDocuments({
        status: "Completed",
      });

    const rejected =
      await EducationSupport.countDocuments({
        status: "Rejected",
      });

    const defaulted =
      await EducationSupport.countDocuments({
        status: "Defaulted",
      });

    const totalRequested =
      await EducationSupport.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$requestedAmount",
            },
          },
        },
      ]);

    const totalDisbursed =
      await EducationSupport.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$approvedAmount",
            },
          },
        },
      ]);

    const outstandingBalance =
      await EducationSupport.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: "$balance",
            },
          },
        },
      ]);

    res.json({

      success: true,

      summary: {

        pending,

        approved,

        disbursed,

        completed,

        rejected,

        defaulted,

        totalRequested:
          totalRequested[0]?.total || 0,

        totalDisbursed:
          totalDisbursed[0]?.total || 0,

        outstandingBalance:
          outstandingBalance[0]?.total || 0,

      },

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success: false,

      message: error.message,

    });

  }

};

// ======================================================
// APPROVE APPLICATION (ADMIN)
// PUT /api/education/:id/approve
// ======================================================

exports.approveApplication = async (req, res) => {
  try {

    const application =
      await EducationSupport.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    if (application.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending applications can be approved.",
      });
    }

    const approvedAmount =
      Number(req.body.approvedAmount) ||
      application.requestedAmount;

    application.approvedAmount = approvedAmount;

    application.interestAmount =
      (approvedAmount * application.interestRate) / 100;

    application.totalRepayment =
      approvedAmount + application.interestAmount;

    application.balance =
      application.totalRepayment;

    application.monthlyInstallment =
      Math.ceil(
        application.totalRepayment /
        application.repaymentPeriodMonths
      );

    application.status = "Approved";
    application.approvalDate = new Date();
    application.approvedBy = req.user._id;
    application.remarks =
      req.body.remarks || "";

    await application.save();

await createNotification({

    recipient: application.member,

    recipientModel: "Member",

    sender: req.user._id,

    senderModel:
        req.user.role === "superadmin"
            ? "SuperAdmin"
            : "Admin",

    title: "Education Support Approved",

    message:
        `Congratulations! Your Education Support application has been approved for KSh ${application.approvedAmount}. Total repayment is KSh ${application.totalRepayment}.`,

    type: "education",

    referenceId: application._id,

    referenceModel: "EducationSupport",

    icon: "school",

});
    

    res.json({
      success: true,
      message: "Education Support approved successfully.",
      application,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ======================================================
// REJECT APPLICATION (ADMIN)
// PUT /api/education/:id/reject
// ======================================================

exports.rejectApplication = async (req, res) => {

  try {

    const application =
      await EducationSupport.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    if (application.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending applications can be rejected.",
      });
    }

    application.status = "Rejected";
    application.rejectionReason =
      req.body.reason || "No reason provided";
    application.approvedBy = req.user._id;
    application.approvalDate = new Date();

    await application.save();

await createNotification({

    recipient: application.member,

    recipientModel: "Member",

    sender: req.user._id,

    senderModel:
        req.user.role === "superadmin"
            ? "SuperAdmin"
            : "Admin",

    title: "Education Support Application Rejected",

    message:
        `Reason: ${application.rejectionReason}`,

    type: "education",

    referenceId: application._id,

    referenceModel: "EducationSupport",

    icon: "cancel",

});

    res.json({
      success: true,
      message: "Application rejected successfully.",
      application,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ======================================================
// DISBURSE FUNDS
// PUT /api/education/:id/disburse
// ======================================================

exports.disburseFunds = async (req, res) => {

  try {

    const application =
      await EducationSupport.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    if (application.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Application must be approved first.",
      });
    }

    application.status = "Disbursed";
    application.disbursementDate = new Date();

    application.paymentReference =
      req.body.paymentReference || "";

    await application.save();
    await createNotification({

    recipient: application.member,

    recipientModel: "Member",

    sender: req.user._id,

    senderModel:
        req.user.role === "superadmin"
            ? "SuperAdmin"
            : "Admin",

    title: "Education Funds Disbursed",

    message:
        `Your Education Support funds of KSh ${application.approvedAmount} have been disbursed successfully. Reference: ${application.paymentReference}`,

    type: "education",

    referenceId: application._id,

    referenceModel: "EducationSupport",

    icon: "payments",

});

    res.json({
      success: true,
      message: "Funds disbursed successfully.",
      application,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ======================================================
// RECORD REPAYMENT
// PUT /api/education/:id/repayment
// ======================================================

exports.recordRepayment = async (req, res) => {

  try {

    const amount =
      Number(req.body.amount);

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid repayment amount.",
      });
    }

    const application =
      await EducationSupport.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    application.amountPaid += amount;

    application.balance -= amount;

    if (application.balance < 0) {
      application.balance = 0;
    }

    if (application.balance === 0) {
      application.status = "Completed";
      application.completionDate =
        new Date();
    }

    await application.save();
    await createNotification({

    recipient: application.member,

    recipientModel: "Member",

    sender: req.user._id,

    senderModel:
        req.user.role === "superadmin"
            ? "SuperAdmin"
            : "Admin",

    title: "Repayment Received",

    message:
        `Repayment of KSh ${amount} has been received. Remaining balance: KSh ${application.balance}.`,

    type: "education",

    referenceId: application._id,

    referenceModel: "EducationSupport",

    icon: "payments",

});

    res.json({
      success: true,
      message: "Repayment recorded successfully.",
      application,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ======================================================
// DELETE APPLICATION (SUPER ADMIN)
// DELETE /api/education/:id
// ======================================================

exports.deleteApplication = async (req, res) => {

  try {

    const application =
      await EducationSupport.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    await application.deleteOne();

    res.json({
      success: true,
      message: "Education Support application deleted successfully.",
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

