const mongoose = require("mongoose");

const mpesaTransactionSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null, index: true },
    purpose: {
      type: String,
      enum: ["loan_repayment", "support_repayment", "community_assistance", "contribution", "other"],
      required: true,
      index: true,
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    referenceModel: { type: String, default: "" },
    phoneNumber: { type: String, default: "", trim: true },
    paymentMethod: { type: String, enum: ["stk", "manual_paybill"], default: "stk", index: true },
    manualPaybill: { type: String, default: "", trim: true },
    manualAccountNumber: { type: String, default: "", trim: true },
    manualTransactionCode: { type: String, default: "", trim: true, uppercase: true },
    reconciled: { type: Boolean, default: false, index: true },
    reconciledAt: { type: Date, default: null },
    amount: { type: Number, required: true, min: 1 },
    businessShortCode: { type: String, default: "" },
    accountReference: { type: String, default: "" },
    merchantRequestId: { type: String, default: "", index: true },
    checkoutRequestId: { type: String, default: "", index: true },
    mpesaReceiptNumber: { type: String, default: "", index: true },
    resultCode: { type: Number, default: null },
    resultDescription: { type: String, default: "" },
    callbackPayload: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: ["initiated", "pending", "successful", "failed", "reversed"], default: "initiated", index: true },
    initiatedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

mpesaTransactionSchema.index({ purpose: 1, referenceId: 1, status: 1 });
mpesaTransactionSchema.index({ paymentMethod: 1, status: 1, createdAt: -1 });
mpesaTransactionSchema.index({ manualTransactionCode: 1 }, { unique: true, sparse: true });
mpesaTransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.models.MpesaTransaction || mongoose.model("MpesaTransaction", mpesaTransactionSchema);
