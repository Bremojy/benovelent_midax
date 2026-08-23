const mongoose = require("mongoose");

const educationSupportSchema = new mongoose.Schema(
  {
    // =====================================
    // CONTRIBUTOR (MEMBER)
    // =====================================

    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },

    memberNumber: {
      type: String,
      required: true,
      trim: true,
    },

    contributorName: {
      type: String,
      required: true,
      trim: true,
    },

    // =====================================
    // DEPENDENT
    // =====================================

    dependent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dependent",
      required: true,
    },

    dependentName: {
      type: String,
      required: true,
    },

    relationship: {
      type: String,
      required: true,
    },

    school: {
      type: String,
      required: true,
    },

    admissionNumber: {
      type: String,
      required: true,
    },

    educationLevel: {
      type: String,
    },

    // =====================================
    // APPLICATION
    // =====================================

    purpose: {
      type: String,
      required: true,
      trim: true,
    },

    requestedAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    approvedAmount: {
      type: Number,
      default: 0,
    },

    interestRate: {
      type: Number,
      default: 10,
    },

    interestAmount: {
      type: Number,
      default: 0,
    },

    totalRepayment: {
      type: Number,
      default: 0,
    },

    repaymentPeriodMonths: {
      type: Number,
      default: 12,
    },

    monthlyInstallment: {
      type: Number,
      default: 0,
    },

    amountPaid: {
      type: Number,
      default: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },

    // =====================================
    // STATUS
    // =====================================

    status: {
      type: String,
      enum: [
        "Pending",
        "Under Review",
        "Documents Required",
        "Eligibility Review",
        "Approval Review",
        "Approved",
        "Disbursement Pending",
        "Paid",
        "Rejected",
        "Disbursed",
        "Completed",
        "Defaulted",
        "Cancelled",
      ],
      default: "Pending",
    },

    applicationDate: {
      type: Date,
      default: Date.now,
    },

    approvalDate: Date,

    disbursementDate: Date,

    completionDate: Date,

    rejectionReason: String,

    remarks: String,

    timeline: [
      { status: String, remarks: String, updatedBy: { type: mongoose.Schema.Types.ObjectId }, date: { type: Date, default: Date.now } }
    ],

    // =====================================
    // FILES
    // =====================================

    feeStructure: String,

    admissionLetter: String,

    supportingDocuments: [
      {
        type: String,
      },
    ],

    // =====================================
    // ADMIN
    // =====================================

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
    },

    repayments: [
      {
        amount: { type: Number, required: true, min: 0 },
        mpesaReceiptNumber: { type: String, default: "" },
        paymentTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "MpesaTransaction", default: null },
        paidAt: { type: Date, default: Date.now },
        method: { type: String, default: "M-PESA" },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// =====================================
// AUTO CALCULATE LOAN
// =====================================

educationSupportSchema.pre("save", async function () {
  const shouldRecalculate = this.isNew ||
    this.isModified("requestedAmount") ||
    this.isModified("approvedAmount") ||
    this.isModified("interestRate") ||
    this.isModified("repaymentPeriodMonths");

  if (!shouldRecalculate) return;

  const principal = Number(this.approvedAmount || this.requestedAmount || 0);
  this.interestAmount = (principal * Number(this.interestRate || 0)) / 100;
  this.totalRepayment = principal + this.interestAmount;
  const previousPaid = Number(this.amountPaid || 0);
  this.balance = Math.max(0, this.totalRepayment - previousPaid);
  this.monthlyInstallment = this.repaymentPeriodMonths > 0
    ? Math.ceil(this.totalRepayment / this.repaymentPeriodMonths)
    : this.totalRepayment;
});

// =====================================

module.exports =
  mongoose.models.EducationSupport ||
  mongoose.model(
    "EducationSupport",
    educationSupportSchema
  );