const mongoose = require("mongoose");

const dependentDocumentSchema = new mongoose.Schema({
  dependent: { type: mongoose.Schema.Types.ObjectId, ref: "Dependent", required: true, index: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true, index: true },
  documentType: { type: String, enum: ["dependent-id", "birth-certificate", "supporting-document", "profile-photo", "other"], default: "other" },
  filename: { type: String, required: true, trim: true },
  mimeType: { type: String, default: "application/octet-stream" },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  uploadedByModel: { type: String, enum: ["Member", "Admin", "SuperAdmin"], required: true },
  verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  verifiedAt: { type: Date, default: null },
  notes: { type: String, default: "" },
}, { timestamps: true });

dependentDocumentSchema.index({ dependent: 1, documentType: 1, createdAt: -1 });

module.exports = mongoose.models.DependentDocument || mongoose.model("DependentDocument", dependentDocumentSchema);
