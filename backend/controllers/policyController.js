const Policy = require("../models/Policy");

const slugify = (value) => String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const clean = (body = {}) => ({
  name: String(body.name || "").trim(),
  slug: slugify(body.slug || body.name),
  category: body.category || "support",
  description: String(body.description || "").trim(),
  enabled: body.enabled !== false,
  maxAmount: Math.max(0, Number(body.maxAmount || 0)),
  minAmount: Math.max(0, Number(body.minAmount || 0)),
  interestRate: Math.max(0, Number(body.interestRate || 0)),
  repaymentEnabled: Boolean(body.repaymentEnabled),
  repaymentMonths: Math.max(1, Number(body.repaymentMonths || 12)),
  communityAssistanceEnabled: Boolean(body.communityAssistanceEnabled),
  applicationPath: String(body.applicationPath || "/member/support").trim(),
  order: Number(body.order || 0),
});

exports.publicList = async (_req, res) => {
  try {
    const policies = await Policy.find({ enabled: true }).sort({ order: 1, name: 1 }).lean();
    res.json({ success: true, policies });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.list = async (_req, res) => {
  try {
    const policies = await Policy.find().sort({ order: 1, name: 1 }).lean();
    res.json({ success: true, policies });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.create = async (req, res) => {
  try {
    const payload = clean(req.body);
    if (!payload.name || !payload.slug) return res.status(400).json({ success: false, message: "Policy name is required." });
    const exists = await Policy.findOne({ slug: payload.slug });
    if (exists) return res.status(409).json({ success: false, message: "A policy with this name/slug already exists." });
    const policy = await Policy.create(payload);
    res.status(201).json({ success: true, policy });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.update = async (req, res) => {
  try {
    const payload = clean(req.body);
    const policy = await Policy.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found." });
    res.json({ success: true, policy });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.remove = async (req, res) => {
  try {
    const policy = await Policy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found." });
    res.json({ success: true, message: "Policy deleted." });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
