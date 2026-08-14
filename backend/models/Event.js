const mongoose = require("mongoose");

const attendeeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "userModel" },
  userModel: { type: String, enum: ["Member", "Admin", "SuperAdmin"], required: true },
  role: { type: String, enum: ["member", "admin", "superadmin"], required: true },
  response: { type: String, enum: ["going", "maybe", "declined"], default: "going" },
  respondedAt: { type: Date, default: Date.now },
}, { _id: false });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: "", maxlength: 4000 },
  type: { type: String, enum: ["meeting", "event", "training", "support", "deadline", "other"], default: "event" },
  startAt: { type: Date, required: true },
  endAt: { type: Date },
  location: { type: String, default: "", trim: true },
  virtualUrl: { type: String, default: "", trim: true },
  coverImage: { type: String, default: "" },
  published: { type: Boolean, default: true },
  audience: { type: [String], enum: ["member", "admin", "superadmin"], default: ["member", "admin", "superadmin"] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "createdByModel" },
  createdByModel: { type: String, enum: ["Member", "Admin", "SuperAdmin"], required: true },
  attendees: { type: [attendeeSchema], default: [] },
}, { timestamps: true });

eventSchema.index({ startAt: 1, published: 1 });
eventSchema.index({ "attendees.user": 1, startAt: 1 });

module.exports = mongoose.models.Event || mongoose.model("Event", eventSchema);
