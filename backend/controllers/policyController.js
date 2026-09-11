const Policy = require("../models/Policy");
const redisCache = require("../services/redisCache");

const slugify = (value) => String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const clean = (body = {}) => ({
  name: String(body.name ?? "").trim(),
  slug: slugify(body.slug ?? body.name),
  category: ["support", "loan", "contribution", "custom"].includes(body.category) ? body.category : "support",
  description: String(body.description ?? "").trim(),
  enabled: body.enabled !== false,
  maxAmount: Number.isFinite(Number(body.maxAmount)) ? Math.max(0, Number(body.maxAmount)) : 0,
  minAmount: Number.isFinite(Number(body.minAmount)) ? Math.max(0, Number(body.minAmount)) : 0,
  interestRate: Number.isFinite(Number(body.interestRate)) ? Math.max(0, Number(body.interestRate)) : 0,
  repaymentEnabled: Boolean(body.repaymentEnabled),
  repaymentMonths: Number.isFinite(Number(body.repaymentMonths)) ? Math.max(1, Math.min(120, Number(body.repaymentMonths))) : 12,
  communityAssistanceEnabled: Boolean(body.communityAssistanceEnabled),
  applicationPath: String(body.applicationPath ?? "/member/support").trim() || "/member/support",
  order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
});

exports.publicList = async (_req, res) => {
  try {
    const cached = await redisCache.getJson("public:policies:enabled");
    if (cached) {
      res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
      return res.json(cached);
    }
    const policies = await Policy.find({ enabled: true }).sort({ order: 1, name: 1 }).lean();
    const payload = { success: true, policies };
    await redisCache.setJson("public:policies:enabled", payload, 300);
    res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
    res.json(payload);
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
    await redisCache.invalidateMany(["public:policies:enabled", "assistant:context:public", "assistant:context:member", "assistant:context:admin", "assistant:context:superadmin"]);
    res.status(201).json({ success: true, policy });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.update = async (req, res) => {
  try {
    const payload = clean(req.body);
    const policy = await Policy.findByIdAndUpdate(req.params.id, payload, { returnDocument: "after", runValidators: true });
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found." });
    await redisCache.invalidateMany(["public:policies:enabled", "assistant:context:public", "assistant:context:member", "assistant:context:admin", "assistant:context:superadmin"]);
    res.json({ success: true, policy });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.remove = async (req, res) => {
  try {
    const policy = await Policy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found." });
    await redisCache.invalidateMany(["public:policies:enabled", "assistant:context:public", "assistant:context:member", "assistant:context:admin", "assistant:context:superadmin"]);
    res.json({ success: true, message: "Policy deleted." });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
