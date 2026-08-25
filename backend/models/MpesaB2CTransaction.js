const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  requestReference: { type: String, required: true, unique: true, index: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null, index: true },
  disbursedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  disbursedByRole: { type: String, enum: ["superadmin"], default: "superadmin" },
  phoneNumber: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 1 },
  remarks: { type: String, default: "Benevolent Midax disbursement", trim: true, maxlength: 182 },
  occasion: { type: String, default: "BENEVOLENT", trim: true, maxlength: 100 },
  status: { type: String, enum: ["pending", "successful", "failed", "timeout"], default: "pending", index: true },
  conversationId: { type: String, default: "", index: true },
  originatorConversationId: { type: String, default: "", index: true },
  transactionReceipt: { type: String, default: "" },
  resultCode: { type: Number, default: null },
  resultDescription: { type: String, default: "" },
  resultPayload: { type: mongoose.Schema.Types.Mixed, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.models.MpesaB2CTransaction || mongoose.model("MpesaB2CTransaction", schema);
