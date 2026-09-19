const mongoose = require("mongoose");

const broadcastSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderModel: { type: String, enum: ["Admin", "SuperAdmin"], required: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  targetedUsers: { type: Number, default: 0 },
  inAppSent: { type: Number, default: 0 },
  emailSent: { type: Number, default: 0 },
  emailAttempted: { type: Number, default: 0 },
  smsSent: { type: Number, default: 0 },
  smsAttempted: { type: Number, default: 0 },
  smsFailed: { type: Number, default: 0 },
  pushSent: { type: Number, default: 0 },
  pushSkipped: { type: Number, default: 0 },
  pushFailed: { type: Number, default: 0 },
  smsEnabled: { type: Boolean, default: false },
  completedAt: { type: Date },
  status: { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
  error: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.models.Broadcast || mongoose.model("Broadcast", broadcastSchema);
