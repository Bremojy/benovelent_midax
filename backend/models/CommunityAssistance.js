const mongoose = require("mongoose");

const communityAssistanceSchema = new mongoose.Schema(
  {
    referenceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    referenceModel: {
      type: String,
      enum: ["SupportRequest", "MedicalSupport", "FuneralSupport", "EducationSupport"],
      required: true,
    },
    recipientMember: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    targetAmount: { type: Number, required: true, min: 1 },
    raisedAmount: { type: Number, default: 0, min: 0 },
    contributionTransactionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "MpesaTransaction" }],
    enabled: { type: Boolean, default: true },
    status: { type: String, enum: ["open", "target_reached", "paused", "closed", "payout_pending", "paid"], default: "open", index: true },
    workflowStatus: {
      type: String,
      enum: [
        "community_appeal_requested",
        "community_appeal_pending_review",
        "community_appeal_approved",
        "community_appeal_rejected",
        "community_campaign_open",
        "community_campaign_closed",
        "completed",
      ],
      default: "community_campaign_open",
      index: true,
    },
    appealRequestedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, default: null, refPath: "reviewedByModel" },
    reviewedByModel: { type: String, enum: ["Admin", "SuperAdmin"], default: undefined },
    reviewReason: { type: String, default: "", trim: true, maxlength: 1000 },
    createdByModel: { type: String, enum: ["Member", "Admin", "SuperAdmin"], default: undefined },
    payoutPhoneNumber: { type: String, default: "" },
    payoutAmount: { type: Number, default: 0 },
    payoutConversationId: { type: String, default: "" },
    payoutOriginatorConversationId: { type: String, default: "" },
    payoutReceipt: { type: String, default: "" },
    payoutDate: { type: Date, default: null },
    payoutStatus: { type: String, enum: ["not_started", "pending", "successful", "failed"], default: "not_started" },
    closedAt: { type: Date, default: null },
    closedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    sourceRemoved: { type: Boolean, default: false, index: true },
    sourceRemovedAt: { type: Date, default: null },
    sourceRemovedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

communityAssistanceSchema.index({ enabled: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.CommunityAssistance || mongoose.model("CommunityAssistance", communityAssistanceSchema);
