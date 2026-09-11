exports.runtimeConfig = async (_req, res) => {
  const settings = await getSystemSettings();
  const publicSettings = settings ? toPublicConfig(settings) : {};
  res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
  return res.json({
    success: true,
    appVersion: process.env.APP_VERSION || "18.5.0",
    mpesa: {
      ...(publicSettings.mpesa || {}),
      enabled: String(process.env.MPESA_ENABLED || "false").toLowerCase() === "true" && publicSettings.mpesa?.stkEnabled !== false,
      environment: String(publicSettings.mpesa?.environment || process.env.MPESA_ENVIRONMENT || "production"),
      shortCode: process.env.MPESA_SHORTCODE || "",
      accountReference: process.env.MPESA_ACCOUNT_REFERENCE || "",
    },
    publicWebUrl: process.env.PUBLIC_WEB_URL || publicSettings.organization?.websiteUrl || "",
    website: publicSettings.website || {},
    organization: publicSettings.organization || {},
    branding: publicSettings.branding || {},
  });
};

const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");
const Notification = require("../models/Notification");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const SupportRequest = require("../models/SupportRequest");
const News = require("../models/News");
const Contribution = require("../models/Contribution");
const AuditLog = require("../models/AuditLog");
const Event = require("../models/Event");
const WebsiteContent = require("../models/WebsiteContent");
const Policy = require("../models/Policy");
const SystemSettings = require("../models/SystemSettings");
const { getSystemSettings, toPublicConfig } = require("../services/systemSettings");
const redisCache = require("../services/redisCache");
const { documentRoot } = require("../config/uploadConfig");
const { logActivity } = require("../services/auditService");

const asUserModel = (role) => role === "superadmin" ? "SuperAdmin" : role === "admin" ? "Admin" : "Member";

const safeUser = (user) => ({
  id: user._id,
  fullName: user.fullName || user.name || "User",
  email: user.email || "",
  role: user.role,
  profileImage: user.profileImage || "",
  siteStation: user.siteStation || "",
  department: user.department || "",
  position: user.position || "",
  memberNumber: user.memberNumber || "",
});

exports.activityCenter = async (req, res) => {
  const role = req.userRole;
  const recipient = req.user._id;
  const recipientModel = asUserModel(role);
  const [notifications, support, conversations, audits] = await Promise.all([
    Notification.find({ recipient, recipientModel }).sort({ createdAt: -1 }).limit(15).lean(),
    role === "member" ? SupportRequest.find({ member: recipient }).sort({ updatedAt: -1 }).limit(8).lean() : SupportRequest.find({ status: { $in: ["Pending", "Under Review"] } }).sort({ updatedAt: -1 }).limit(8).lean(),
    Conversation.find({ participants: recipient }).sort({ lastMessageTime: -1 }).limit(8).lean(),
    role === "member" ? AuditLog.find({ user: recipient, userModel: "Member" }).sort({ createdAt: -1 }).limit(8).lean() : AuditLog.find({}).sort({ createdAt: -1 }).limit(8).lean(),
  ]);
  res.json({ success: true, data: { notifications, support, conversations, audits } });
};

exports.directory = async (req, res) => {
  const q = String(req.query.q || "").trim();
  const station = String(req.query.station || "").trim();
  const department = String(req.query.department || "").trim();
  const online = req.query.online === "true" ? true : req.query.online === "false" ? false : undefined;
  const filter = { isDeleted: { $ne: true }, status: "active", role: "member" };
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { fullName: { $regex: safe, $options: "i" } },
      { memberNumber: { $regex: safe, $options: "i" } },
      { email: { $regex: safe, $options: "i" } },
      { department: { $regex: safe, $options: "i" } },
      { position: { $regex: safe, $options: "i" } },
    ];
  }
  if (station) filter.siteStation = station;
  if (department) filter.department = department;
  if (online !== undefined) filter.online = online;
  const members = await Member.find(filter).select("fullName memberNumber profileImage siteStation customSiteStation department position online lastSeen county ward").sort({ fullName: 1 }).limit(200).lean();
  const stations = await Member.aggregate([
    { $match: { isDeleted: { $ne: true }, status: "active", role: "member" } },
    { $group: { _id: "$siteStation", count: { $sum: 1 }, online: { $sum: { $cond: ["$online", 1, 0] } } } },
    { $sort: { count: -1 } },
  ]);
  res.json({ success: true, members, stations });
};

exports.search = async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json({ success: true, data: { members: [], news: [], documents: [] } });
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(safe, "i");
  const role = req.userRole;
  const memberQuery = role === "member" ? { role: "member", status: "active" } : { isDeleted: { $ne: true }, status: "active" };
  const [members, news] = await Promise.all([
    role === "member" ? Promise.resolve([]) : Member.find({ ...memberQuery, $or: [{ fullName: regex }, { memberNumber: regex }, { department: regex }, { siteStation: regex }] }).select("fullName memberNumber profileImage siteStation department position").limit(12).lean(),
    News.find({ published: true, status: "published", $or: [{ title: regex }, { summary: regex }, { content: regex }, { category: regex }] }).select("title summary category coverImage publishDate slug").sort({ publishDate: -1 }).limit(12).lean(),
  ]);
  const root = path.join(documentRoot);
  const publicRoot = path.join(__dirname, "..", "..", "public", "documents");
  const files = [];
  const seenDocuments = new Set();
  for (const dir of [root, publicRoot]) {
    try {
      for (const name of fs.readdirSync(dir)) {
        if (!/\.(pdf|docx?|xlsx?|pptx?)$/i.test(name) || !regex.test(name)) continue;
        const key = String(name).toLowerCase();
        if (seenDocuments.has(key)) continue;
        seenDocuments.add(key);
        files.push({ name, url: `/documents/${encodeURIComponent(name)}` });
      }
    } catch (_) {}
  }
  res.json({ success: true, data: { members, news, documents: files.slice(0, 12) } });
};

exports.events = async (req, res) => {
  const role = req.userRole;
  const now = new Date();
  const events = await Event.find({ published: true, audience: role, startAt: { $gte: new Date(now.getTime() - 86400000 * 14) } }).sort({ startAt: 1 }).limit(50).lean();
  res.json({ success: true, events });
};

exports.createEvent = async (req, res) => {
  const role = req.userRole;
  if (!["admin", "superadmin"].includes(role)) return res.status(403).json({ success: false, message: "Only administrators can create events." });
  const event = await Event.create({
    title: String(req.body.title || "").trim(),
    description: String(req.body.description || "").trim(),
    type: req.body.type || "event",
    startAt: req.body.startAt,
    endAt: req.body.endAt || null,
    location: String(req.body.location || "").trim(),
    virtualUrl: String(req.body.virtualUrl || "").trim(),
    coverImage: String(req.body.coverImage || "").trim(),
    audience: Array.isArray(req.body.audience) && req.body.audience.length ? req.body.audience : ["member", "admin", "superadmin"],
    createdBy: req.user._id,
    createdByModel: asUserModel(role),
  });
  await logActivity({ user: req.user._id, userModel: asUserModel(role), userRole: role, action: "CREATE", module: "Events", description: `Created event ${event.title}`, endpoint: req.originalUrl, method: req.method });
  res.status(201).json({ success: true, event });
};

exports.rsvp = async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: "Event not found." });
  const role = req.userRole;
  const userId = String(req.user._id);
  const userModel = asUserModel(role);
  const response = ["going", "maybe", "declined"].includes(req.body.response) ? req.body.response : "going";
  const existing = event.attendees.find(a => String(a.user) === userId && a.userModel === userModel);
  if (existing) { existing.response = response; existing.respondedAt = new Date(); }
  else event.attendees.push({ user: req.user._id, userModel, role, response, respondedAt: new Date() });
  await event.save();
  res.json({ success: true, event });
};

exports.analytics = async (req, res) => {
  if (!["admin", "superadmin"].includes(req.userRole)) return res.status(403).json({ success: false, message: "Administrator access required." });
  const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0,0,0,0);
  const [membersByStation, supportByStatus, contributionTrend, activeMembers, recentAudit] = await Promise.all([
    Member.aggregate([{ $match: { role: "member", isDeleted: { $ne: true }, status: "active" } }, { $group: { _id: "$siteStation", count: { $sum: 1 } } }, { $sort: { count: -1 } }]).catch(() => []),
    SupportRequest.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Contribution.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } }, paid: { $sum: "$paidAmount" }, expected: { $sum: "$expectedAmount" } } }, { $sort: { "_id.y": 1, "_id.m": 1 } }]),
    Member.countDocuments({ role: "member", status: "active", online: true }),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(12).select("userRole action module description status createdAt").lean(),
  ]);
  res.json({ success: true, data: { membersByStation, supportByStatus, contributionTrend, activeMembers, recentAudit } });
};

exports.documents = async (_req, res) => {
  const publicRoot = path.join(__dirname, "..", "..", "public", "documents");
  const roots = [documentRoot, publicRoot];
  const seen = new Set(); const documents = [];
  for (const root of roots) {
    try { for (const name of fs.readdirSync(root)) { if (!/\.(pdf|docx?|xlsx?|pptx?)$/i.test(name) || seen.has(name)) continue; seen.add(name); const full = path.join(root, name); const stat = fs.statSync(full); documents.push({ name, url: `/documents/${encodeURIComponent(name)}`, size: stat.size, updatedAt: stat.mtime }); } } catch (_) {}
  }
  res.json({ success: true, documents });
};

exports.membershipCard = async (req, res) => {
  const role = req.userRole;
  const isSelf = String(req.user._id) === String(req.params.memberId || req.user._id);
  if (!isSelf && !["admin", "superadmin"].includes(role)) return res.status(403).json({ success: false, message: "Access denied." });
  const member = role === "member" ? req.user : await Member.findById(req.params.memberId || req.user._id).select("fullName memberNumber profileImage siteStation department position status verified joinDate role").lean();
  if (!member) return res.status(404).json({ success: false, message: "Member not found." });
  const token = jwt.sign({ memberId: member._id, purpose: "membership-card" }, process.env.JWT_SECRET, { expiresIn: "365d" });
  const publicBase = process.env.PUBLIC_WEB_URL || "https://benovelent-midax.vercel.app";
  const verifyUrl = `${publicBase}/verify-membership?token=${encodeURIComponent(token)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(verifyUrl)}`;
  res.json({ success: true, card: { member: safeUser(member), joinDate: member.joinDate, status: member.status, verified: member.verified, verifyUrl, qrUrl } });
};

exports.verifyMembership = async (req, res) => {
  try {
    const decoded = jwt.verify(String(req.query.token || ""), process.env.JWT_SECRET);
    if (decoded.purpose !== "membership-card") throw new Error("Invalid purpose");
    const member = await Member.findById(decoded.memberId).select("fullName memberNumber profileImage siteStation department position status verified joinDate role").lean();
    if (!member || member.status !== "active") return res.status(404).json({ success: false, message: "Membership could not be verified." });
    res.json({ success: true, member: safeUser(member), verified: Boolean(member.verified) });
  } catch (error) { res.status(400).json({ success: false, message: "Invalid or expired membership verification code." }); }
};


const ASSISTANT_KNOWLEDGE = [
  ["identity", /\b(who are you|what can you do|help|assistant|benovelent|benevolent midax)\b/i, "I’m the Benevolent MIDAX Assistant. I provide guidance from the current published website, enabled policies and safe system settings. I will not invent rules or expose private records."],
  ["greeting", /\b(hello|hi|hey|good morning|good afternoon|good evening)\b/i, "Hello and welcome to Benevolent MIDAX. Tell me what you need help with and I’ll guide you from the current published information."],
  ["privacy security", /\b(privacy|security|secure|personal data|private information|data protection)\b/i, "Use the published Privacy Policy for official privacy guidance. Never share passwords, one-time codes, access tokens or private member records with the assistant."],
  ["login", /\b(login|log in|sign in|access portal|username|password)\b/i, "Use the Login page to enter the secure portal with the credentials issued for your account. Keep credentials private."],
  ["constitution", /\b(constitution|rules|governance|bylaws|scheme rules)\b/i, "The published Constitution is the authoritative source for governance and scheme procedures. Open Constitution to read the current document."],
  ["news", /\b(news|announcement|announcements|updates|newsroom)\b/i, "Open News to see published announcements, activities, resources and community updates."],
  ["events", /\b(event|events|calendar|activity|activities|meeting|meetings)\b/i, "Open Events or News to see published activities. Visibility follows the configured audience."],
  ["resources", /\b(resource|resources|document|documents|form|forms|guide|guides|download)\b/i, "Open Resources to view currently published forms, guides and official documents."],
  ["contact", /\b(contact|phone number|email address|whatsapp|office|location)\b/i, "Open Contact for the current official enquiry channels and location information."],
  ["member portal", /\b(member portal|member dashboard|member features)\b/i, "The authenticated member portal exposes only the features available to the signed-in member and account status."],
  ["admin portal", /\b(admin portal|admin dashboard|administrator|admin features)\b/i, "The Admin portal exposes authorised operational tools according to the signed-in role."],
  ["superadmin portal", /\b(superadmin|super admin|super administrator)\b/i, "The Super Admin portal exposes higher-level configuration, audit and governance controls."],
];

const tokenise = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2);
const bestKnowledgeAnswer = (question) => {
  const normalized = String(question || "").trim();
  if (!normalized) return null;
  const exact = ASSISTANT_KNOWLEDGE.find(([, pattern]) => pattern.test(normalized));
  return exact?.[2] || null;
};


function assistantConfiguredFaqs(chatbotSection) {
  const content = chatbotSection?.content || {};
  if (Array.isArray(content.faqs)) return content.faqs;
  if (Array.isArray(content.faq)) return content.faq;
  if (typeof content.body === "string") {
    try { const parsed = JSON.parse(content.body); if (Array.isArray(parsed?.faqs)) return parsed.faqs; } catch (_) {}
  }
  return [];
}

exports.assistant = async (req, res) => {
  const question = String(req.body?.question || "").trim();
  if (!question) return res.status(400).json({ success: false, message: "Question is required." });
  const role = req.userRole || "public";
  const contextKey = `assistant:context:${String(role).toLowerCase()}`;
  const context = await redisCache.cacheAside(contextKey, async () => {
    const [news, events, website, policies, settings, resources] = await Promise.all([
      News.find({ published: true, status: "published" }).sort({ publishDate: -1 }).limit(20).select("title summary category content publishDate").lean(),
      Event.find({ published: true, startAt: { $gte: new Date(Date.now() - 86400000 * 30) }, ...(role !== "public" ? { audience: role } : {}) }).sort({ startAt: 1 }).limit(20).select("title description type startAt location audience").lean(),
      WebsiteContent.find({ published: true, section: { $in: ["home", "about", "services", "contact", "footer", "settings", "gallery", "constitution", "privacy-policy", "terms-conditions", "news", "events", "resources", "chatbot"] } }).select("section title subtitle description content updatedAt").lean(),
      Policy.find({ enabled: true }).sort({ displayOrder: 1, updatedAt: -1 }).limit(50).select("_id title summary description category minAmount maxAmount interestRate repaymentEnabled repaymentMonths communityAssistance displayOrder applicationPath updatedAt").lean(),
      getSystemSettings(),
      (async () => {
        const publicRoot = path.join(__dirname, "..", "..", "public", "documents");
        try { return fs.readdirSync(publicRoot).filter((name) => /\.(pdf|docx?|xlsx?|pptx?)$/i.test(name)).slice(0, 50); } catch (_) { return []; }
      })(),
    ]);
    return { news, events, website, policies, settings: settings ? toPublicConfig(settings) : null, resources, configuredFaqs: assistantConfiguredFaqs(website.find?.((item) => String(item.section || "").toLowerCase() === "chatbot")) };
  }, 60);
  const { news, events, website, policies, settings, resources, configuredFaqs } = context;

  const normalized = question.toLowerCase();
  const tokens = tokenise(question);
  const publishedMatches = news.filter((item) => tokens.some((token) => `${item.title || ""} ${item.summary || ""} ${item.category || ""} ${item.content || ""}`.toLowerCase().includes(token)));
  const eventMatches = events.filter((item) => tokens.some((token) => `${item.title || ""} ${item.description || ""} ${item.location || ""}`.toLowerCase().includes(token)));

  const faqMatch = configuredFaqs.find((item) => {
    const q = String(item.question || item.q || item.title || "").trim().toLowerCase();
    return q && (normalized === q || normalized.includes(q));
  });
  const knowledgeAnswer = faqMatch
    ? String(faqMatch.answer || faqMatch.response || faqMatch.body || "")
    : bestKnowledgeAnswer(question);
  let answer = knowledgeAnswer;
  if (!answer && publishedMatches.length) answer = `A published update that matches your question is “${publishedMatches[0].title}”. ${publishedMatches[0].summary || "Open News for the full update."}`;
  else if (!answer && eventMatches.length) answer = `A matching activity is “${eventMatches[0].title}”${eventMatches[0].location ? ` at ${eventMatches[0].location}` : ""}. It starts ${new Date(eventMatches[0].startAt).toLocaleString()}.`;
  else if (!answer && (normalized.includes("resource") || normalized.includes("document"))) answer = `The Resource Centre currently lists ${resources.length} published document${resources.length === 1 ? "" : "s"}. Open Resources to view them.`;
  else if (!answer) {
    const scope = role === "public"
      ? "the public Benevolent MIDAX website"
      : "your authorised Benevolent MIDAX portal";
    answer = `I can help you with ${scope}, but I do not want to guess and give you the wrong rule. Tell me what you are trying to do in simple words—for example “my profile is 100%”, “how do I add a dependant?”, “what is BM001?”, “how do I submit support?”, “how do I make a video call?”, or “where is the Constitution?”—and I’ll guide you from there.`;
  }

  // Optional server-side language provider remains grounded by the same knowledge
  // and is never exposed as a user-facing feature name.
  const providerUrl = String(process.env.ASSISTANT_PROVIDER_URL || process.env.AI_API_URL || "").trim();
  const providerKey = String(process.env.ASSISTANT_PROVIDER_KEY || process.env.AI_API_KEY || "").trim();
  const providerModel = String(process.env.ASSISTANT_MODEL || process.env.AI_MODEL || "").trim();
  if (providerUrl && providerKey && providerModel && typeof fetch === "function") {
    try {
      const groundedContext = JSON.stringify({ service: "Benevolent MIDAX", role, website, news, events, resources, policies, settings, configuredFaqs, applicationGuidance: ASSISTANT_KNOWLEDGE.map(([name, , text]) => ({ name, text })) });
      const response = await fetch(providerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${providerKey}` },
        body: JSON.stringify({ model: providerModel, messages: [
          { role: "system", content: `You are the Benevolent MIDAX website assistant. Answer only from the supplied application context. Respect the portal role. Never reveal private member data. If the answer is not in context, say so and direct the user to the appropriate page. Context: ${groundedContext}` },
          { role: "user", content: question },
        ], temperature: 0.1 }),
      });
      if (response.ok) {
        const data = await response.json();
        const generated = data?.choices?.[0]?.message?.content || data?.output?.[0]?.content?.[0]?.text;
        if (generated) answer = String(generated).trim();
      }
    } catch (error) {
      console.warn("Assistant provider unavailable:", error.message);
    }
  }

  res.json({ success: true, answer, source: "application" });
};


exports.assistantContext = async (req, res) => {
  const role = req.userRole || "public";
  const [website, news, events, policies, settings] = await Promise.all([
    WebsiteContent.find({ published: true }).sort({ section: 1 }).limit(40).select("section title subtitle description content updatedAt").lean(),
    News.find({ published: true, status: "published" }).sort({ publishDate: -1 }).limit(8).select("title summary category publishDate").lean(),
    Event.find({ published: true, ...(role !== "public" ? { audience: role } : {}), startAt: { $gte: new Date(Date.now() - 86400000) } }).sort({ startAt: 1 }).limit(8).select("title description type startAt location audience").lean().catch(() => []),
    Policy.find({ enabled: true }).sort({ displayOrder: 1, updatedAt: -1 }).limit(50).select("title summary description category minAmount maxAmount interestRate repaymentEnabled repaymentMonths communityAssistance displayOrder applicationPath updatedAt").lean(),
    getSystemSettings(),
  ]);
  res.json({ success: true, context: { role, service: "Benevolent Midax", website, news, events, policies, settings: settings ? toPublicConfig(settings) : null } });
};

exports.publicEvents = async (_req, res) => {
  const events = await Event.find({ published: true, audience: { $in: ["member", "admin", "superadmin"] }, startAt: { $gte: new Date(Date.now() - 86400000 * 7) } }).sort({ startAt: 1 }).limit(50).select("title description type startAt endAt location virtualUrl coverImage").lean();
  res.json({ success: true, events });
};

exports.publicDocuments = async (_req, res) => {
  const publicRoot = path.join(__dirname, "..", "..", "public", "documents");
  const documents = [];
  try {
    for (const name of fs.readdirSync(publicRoot)) {
      if (!/\.(pdf|docx?|xlsx?|pptx?)$/i.test(name)) continue;
      const stat = fs.statSync(path.join(publicRoot, name));
      documents.push({ name, url: `/documents/${encodeURIComponent(name)}`, size: stat.size, updatedAt: stat.mtime });
    }
  } catch (_) {}
  res.json({ success: true, documents });
};

exports.publicMembershipVerifyPage = async (req, res) => { res.json({ success: true, message: "Use GET /api/platform/membership/verify?token=..." }); };
