const crypto = require("crypto");
const FeedbackCollection = require("../models/FeedbackCollection");

function normalizeQuestions(questions = []) {
  return questions.map((q) => ({
    id: q.id || crypto.randomUUID(),
    type: q.type || "short_text",
    label: String(q.label || "").trim(),
    required: Boolean(q.required),
    options: Array.isArray(q.options) ? q.options.map(String).filter(Boolean) : [],
  })).filter((q) => q.label);
}

function visible(collection) {
  return {
    _id: collection._id,
    title: collection.title,
    description: collection.description,
    kind: collection.kind,
    googleFormUrl: collection.googleFormUrl,
    questions: collection.questions,
    anonymous: collection.anonymous,
    preventDuplicate: collection.preventDuplicate,
    status: collection.status,
    startDate: collection.startDate,
    endDate: collection.endDate,
    createdAt: collection.createdAt,
    responseCount: collection.responses?.length || 0,
  };
}

exports.list = async (req, res) => {
  const filter = req.user.role === "member" ? { status: "active" } : {};
  const docs = await FeedbackCollection.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, collections: docs.map(visible) });
};

exports.create = async (req, res) => {
  const { title, description, kind, googleFormUrl, questions, anonymous, preventDuplicate, status, startDate, endDate } = req.body;
  if (!title || !kind) return res.status(400).json({ success: false, message: "Title and feedback type are required." });
  if (kind === "google_form" && !googleFormUrl) return res.status(400).json({ success: false, message: "Google Forms URL is required." });
  if (kind === "native" && !Array.isArray(questions)) return res.status(400).json({ success: false, message: "Native feedback questions are required." });
  const doc = await FeedbackCollection.create({
    title, description, kind, googleFormUrl: kind === "google_form" ? googleFormUrl : "",
    questions: kind === "native" ? normalizeQuestions(questions) : [], anonymous: Boolean(anonymous),
    preventDuplicate: preventDuplicate !== false, status: status || "active", startDate: startDate || null, endDate: endDate || null,
    createdBy: req.user._id, createdByRole: req.user.role,
  });
  res.status(201).json({ success: true, collection: visible(doc) });
};

exports.update = async (req, res) => {
  const doc = await FeedbackCollection.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Feedback collection not found." });
  const allowed = ["title","description","googleFormUrl","questions","anonymous","preventDuplicate","status","startDate","endDate"];
  for (const key of allowed) if (req.body[key] !== undefined) doc[key] = key === "questions" ? normalizeQuestions(req.body[key]) : req.body[key];
  await doc.save();
  res.json({ success: true, collection: visible(doc) });
};

exports.remove = async (req, res) => {
  const doc = await FeedbackCollection.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Feedback collection not found." });
  res.json({ success: true, message: "Feedback collection deleted." });
};

exports.submit = async (req, res) => {
  const doc = await FeedbackCollection.findById(req.params.id);
  if (!doc || doc.status !== "active") return res.status(404).json({ success: false, message: "Feedback collection is not available." });
  const now = new Date();
  if (doc.startDate && now < doc.startDate) return res.status(400).json({ success: false, message: "Feedback collection has not started yet." });
  if (doc.endDate && now > doc.endDate) return res.status(400).json({ success: false, message: "Feedback collection has closed." });
  if (doc.kind !== "native") return res.status(400).json({ success: false, message: "Only native feedback can be submitted here." });
  const memberId = req.user._id;
  if (doc.preventDuplicate && memberId && doc.responses.some((r) => String(r.member) === String(memberId))) {
    return res.status(409).json({ success: false, message: "You have already submitted this feedback." });
  }
  const answers = req.body.answers || {};
  for (const q of doc.questions) {
    if (q.required && (answers[q.id] === undefined || answers[q.id] === "" || (Array.isArray(answers[q.id]) && !answers[q.id].length))) {
      return res.status(400).json({ success: false, message: `Please answer: ${q.label}` });
    }
  }
  doc.responses.push({ member: doc.anonymous ? null : memberId, anonymous: doc.anonymous, answers });
  await doc.save();
  res.status(201).json({ success: true, message: "Thank you for your feedback." });
};


exports.ensureBuiltIn = async (req, res) => {
  const title = "Benovelent Website Experience Check-in";
  const existing = await FeedbackCollection.findOne({ title });
  if (existing) return res.json({ success: true, collection: visible(existing), existing: true });

  const doc = await FeedbackCollection.create({
    title,
    description: "We want to improve the Benovelent website for members and the leadership team. Tell us what feels good, what is exhausting, and what you would like us to build next.",
    kind: "native",
    questions: normalizeQuestions([
      { id: "experience", type: "rating", label: "How would you rate your overall website experience?", required: true },
      { id: "feature", type: "long_text", label: "What feature would you like us to add or improve next?", required: true },
      { id: "exhausting", type: "long_text", label: "What part of using the website is exhausting, confusing or frustrating you?", required: true },
      { id: "positive", type: "long_text", label: "What is working well for you and should we keep?", required: false },
    ]),
    anonymous: false,
    preventDuplicate: true,
    status: "active",
    createdBy: req.user._id,
    createdByRole: req.user.role,
  });

  res.status(201).json({ success: true, collection: visible(doc), existing: false });
};

exports.responses = async (req, res) => {
  const doc = await FeedbackCollection.findById(req.params.id).populate("responses.member", "fullName email memberNumber");
  if (!doc) return res.status(404).json({ success: false, message: "Feedback collection not found." });
  res.json({ success: true, collection: visible(doc), responses: doc.responses });
};
