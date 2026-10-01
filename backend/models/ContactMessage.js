const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
    phone: { type: String, trim: true, default: "", maxlength: 40 },
    subject: { type: String, required: true, trim: true, maxlength: 180 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: ["new", "read", "replied", "archived"], default: "new", index: true },
    repliedAt: { type: Date, default: null },
    replies: [{
      body: { type: String, required: true, trim: true, maxlength: 5000 },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "replies.repliedByModel" },
      repliedByModel: { type: String, enum: ["Admin", "SuperAdmin"], required: true },
      repliedAt: { type: Date, default: Date.now },
      emailAccepted: { type: Boolean, default: false },
      emailProvider: { type: String, default: "" },
      emailId: { type: String, default: "" },
      emailError: { type: String, default: "" },
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.models.ContactMessage || mongoose.model("ContactMessage", contactMessageSchema);
