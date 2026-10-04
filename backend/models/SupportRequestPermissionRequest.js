const mongoose = require("mongoose");

const supportRequestPermissionRequestSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    sourceModel: { type: String, enum: ["SupportRequest"], required: true, default: "SupportRequest", index: true },
    sourceType: { type: String, enum: ["support"], required: true, default: "support", index: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    requestedAction: { type: String, enum: ["edit", "delete"], required: true, index: true },
    reason: { type: String, required: true, trim: true, maxlength: 1200 },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Consumed", "Expired"],
      default: "Pending",
      index: true,
    },
    requestedAt: { type: Date, default: Date.now, index: true },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, refPath: "reviewedByModel", default: null },
    reviewedByModel: { type: String, enum: ["Admin", "SuperAdmin"], default: undefined },
    reviewReason: { type: String, default: "", trim: true, maxlength: 1200 },
    consumedAt: { type: Date, default: null },
    consumedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
  },
  { timestamps: true }
);

supportRequestPermissionRequestSchema.index({ member: 1, sourceModel: 1, sourceId: 1, requestedAction: 1, status: 1 });
supportRequestPermissionRequestSchema.index({ sourceModel: 1, sourceId: 1, status: 1 });

module.exports = mongoose.models.SupportRequestPermissionRequest
  || mongoose.model("SupportRequestPermissionRequest", supportRequestPermissionRequestSchema);
