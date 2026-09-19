const mongoose = require("mongoose");

const dependentEditRequestSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
  dependent: { type: mongoose.Schema.Types.ObjectId, ref: "Dependent", required: true, index: true },
  requestedChanges: { type: mongoose.Schema.Types.Mixed, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 2000 },
  supportingFiles: [{ fileName: String, mimeType: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, default: null },
  reviewerModel: { type: String, enum: ["Admin", "SuperAdmin"], default: null },
  reviewNotes: { type: String, default: "" },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

dependentEditRequestSchema.index({ dependent: 1, status: 1 });
dependentEditRequestSchema.index({ member: 1, createdAt: -1 });

module.exports = mongoose.models.DependentEditRequest || mongoose.model("DependentEditRequest", dependentEditRequestSchema);
