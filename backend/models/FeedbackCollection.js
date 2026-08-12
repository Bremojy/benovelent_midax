const mongoose = require("mongoose");

const feedbackQuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ["short_text", "long_text", "email", "number", "rating", "single_choice", "multiple_choice"], required: true },
  label: { type: String, required: true, trim: true },
  required: { type: Boolean, default: false },
  options: { type: [String], default: [] },
}, { _id: false });

const feedbackResponseSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
  anonymous: { type: Boolean, default: false },
  answers: { type: mongoose.Schema.Types.Mixed, default: {} },
  submittedAt: { type: Date, default: Date.now },
}, { _id: true });

const feedbackCollectionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  kind: { type: String, enum: ["native", "google_form"], required: true },
  googleFormUrl: { type: String, default: "" },
  questions: { type: [feedbackQuestionSchema], default: [] },
  anonymous: { type: Boolean, default: false },
  preventDuplicate: { type: Boolean, default: true },
  status: { type: String, enum: ["draft", "active", "closed"], default: "active" },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdByRole: { type: String, enum: ["admin", "superadmin"], required: true },
  responses: { type: [feedbackResponseSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model("FeedbackCollection", feedbackCollectionSchema);
