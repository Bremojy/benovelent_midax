const mongoose = require("mongoose");

const supportAttachmentSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    label: {
      type: String,
      trim: true,
      default: "",
    },
    customCategory: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120,
    },
    fileName: {
      type: String,
      trim: true,
      default: "",
    },
    fileUrl: {
      type: String,
      trim: true,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const supportRequestSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    supportType: {
      type: String,
      required: true,
      trim: true,
    },
    policySlug: { type: String, trim: true, default: "" },
    policyName: { type: String, trim: true, default: "" },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    requestedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    documents: {
      type: [supportAttachmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["Pending", "Under Review", "Documents Required", "Eligibility Review", "Approval Review", "Approved", "Disbursement Pending", "Paid", "Completed", "Rejected", "Cancelled", "Closed"],
      default: "Pending",
    },
    approvedAmount: {
      type: Number,
      default: 0,
    },
    repaymentEnabled: { type: Boolean, default: false },
    repaymentMonths: { type: Number, default: 12, min: 1, max: 120 },
    interestRate: { type: Number, default: 0, min: 0 },
    totalRepayment: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0, min: 0 },
    monthlyInstallment: { type: Number, default: 0, min: 0 },
    rejectionReason: {
      type: String,
      default: "",
    },
    remarks: {
      type: String,
      default: "",
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    timeline: [
      {
        status: String,
        remarks: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

supportRequestSchema.pre("save", function(next) {
  if (this.isNew || this.isModified("approvedAmount") || this.isModified("repaymentEnabled") || this.isModified("interestRate")) {
    const principal = Number(this.approvedAmount || this.requestedAmount || 0);
    this.totalRepayment = this.repaymentEnabled ? principal + (principal * Number(this.interestRate || 0) / 100) : 0;
    this.balance = this.repaymentEnabled ? Math.max(0, this.totalRepayment - Number(this.amountPaid || 0)) : 0;
    this.monthlyInstallment = this.repaymentEnabled ? (this.repaymentMonths > 0 ? Math.ceil(this.totalRepayment / this.repaymentMonths) : this.totalRepayment) : 0;
  }
  next();
});

supportRequestSchema.index({ member: 1, status: 1 });
supportRequestSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.SupportRequest ||
  mongoose.model("SupportRequest", supportRequestSchema);
