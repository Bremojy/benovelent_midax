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
      min: 1000,
      max: 20000,
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
        "Approved",
        "Rejected",
        "Disbursed",
        "Completed",
        "Defaulted",
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
  },
  {
    timestamps: true,
  }
);

// =====================================
// AUTO CALCULATE LOAN
// =====================================

educationSupportSchema.pre("save", function (next) {
  this.interestAmount =
    (this.requestedAmount * this.interestRate) / 100;

  this.totalRepayment =
    this.requestedAmount + this.interestAmount;

  this.balance = this.totalRepayment;

  this.monthlyInstallment =
    Math.ceil(
      this.totalRepayment /
        this.repaymentPeriodMonths
    );

  next();
});

// =====================================

module.exports =
  mongoose.models.EducationSupport ||
  mongoose.model(
    "EducationSupport",
    educationSupportSchema
  );