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
    enabled: { type: Boolean, default: true },
    status: { type: String, enum: ["open", "target_reached", "paused", "closed", "payout_pending", "paid"], default: "open", index: true },
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
  },
  { timestamps: true }
);

communityAssistanceSchema.index({ enabled: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.CommunityAssistance || mongoose.model("CommunityAssistance", communityAssistanceSchema);
