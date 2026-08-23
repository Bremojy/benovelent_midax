const mongoose = require("mongoose");

const policySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    category: { type: String, enum: ["support", "loan", "contribution", "custom"], default: "support" },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    enabled: { type: Boolean, default: true },
    maxAmount: { type: Number, default: 0, min: 0 },
    minAmount: { type: Number, default: 0, min: 0 },
    interestRate: { type: Number, default: 0, min: 0 },
    repaymentEnabled: { type: Boolean, default: false },
    repaymentMonths: { type: Number, default: 12, min: 1, max: 120 },
    communityAssistanceEnabled: { type: Boolean, default: false },
    applicationPath: { type: String, default: "/member/support" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

policySchema.index({ enabled: 1, order: 1 });
policySchema.index({ category: 1, enabled: 1 });

module.exports = mongoose.models.Policy || mongoose.model("Policy", policySchema);
