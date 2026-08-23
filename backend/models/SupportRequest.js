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
      enum: ["Pending", "Under Review", "Approved", "Rejected", "Closed"],
      default: "Pending",
    },
    approvedAmount: {
      type: Number,
      default: 0,
    },
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

supportRequestSchema.index({ member: 1, status: 1 });
supportRequestSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.SupportRequest ||
  mongoose.model("SupportRequest", supportRequestSchema);
