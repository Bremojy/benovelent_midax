const mongoose = require("mongoose");

const pushSubscriptionSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientModel: { type: String, enum: ["Member", "Admin", "SuperAdmin"], required: true },
    endpoint: { type: String, required: true, trim: true },
    expirationTime: { type: Date, default: null },
    keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
    userAgent: { type: String, default: "" },
  }, { timestamps: true }
);

pushSubscriptionSchema.index({ recipient: 1, recipientModel: 1, endpoint: 1 }, { unique: true });
module.exports = mongoose.models.PushSubscription || mongoose.model("PushSubscription", pushSubscriptionSchema);
