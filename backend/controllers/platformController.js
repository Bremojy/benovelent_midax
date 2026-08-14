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
  for (const dir of [root, publicRoot]) {
    try {
      for (const name of fs.readdirSync(dir)) if (/\.(pdf|docx?|xlsx?|pptx?)$/i.test(name) && regex.test(name)) files.push({ name, url: `/documents/${encodeURIComponent(name)}` });
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


exports.assistant = async (req, res) => {
  const question = String(req.body?.question || "").trim();
  if (!question) return res.status(400).json({ success: false, message: "Question is required." });
  const role = req.userRole || "public";
  const [news, events] = await Promise.all([
    News.find({ published: true, status: "published" }).sort({ publishDate: -1 }).limit(10).select("title summary category content publishDate").lean(),
    Event.find({ published: true, startAt: { $gte: new Date(Date.now() - 86400000 * 7) }, ...(role !== "public" ? { audience: role } : {}) }).sort({ startAt: 1 }).limit(10).select("title description type startAt location").lean(),
  ]);
  const context = JSON.stringify({ service: "Benevolent MIDAX", role, news, events });
  const aiUrl = String(process.env.AI_API_URL || "").trim();
  const aiKey = String(process.env.AI_API_KEY || "").trim();
  const aiModel = String(process.env.AI_MODEL || "").trim();
  if (aiUrl && aiKey && aiModel && typeof fetch === "function") {
    try {
      const response = await fetch(aiUrl, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` }, body: JSON.stringify({ model: aiModel, messages: [{ role: "system", content: `You are the Benevolent MIDAX assistant. Answer only from the supplied application context. Respect the user's portal role; never reveal private member data to a public user. If the context does not contain the answer, say so and direct the user to the appropriate website/portal section. Context: ${context}` }, { role: "user", content: question }], temperature: 0.2 }) });
      if (response.ok) { const data = await response.json(); const answer = data?.choices?.[0]?.message?.content || data?.output?.[0]?.content?.[0]?.text; if (answer) return res.json({ success: true, answer: String(answer).trim(), source: "ai" }); }
    } catch (error) { console.warn("Optional AI provider unavailable:", error.message); }
  }
  const normalized = question.toLowerCase();
  const matches = news.filter(n => `${n.title} ${n.summary} ${n.category}`.toLowerCase().includes(normalized.split(/\s+/).find(w => w.length > 3) || "___"));
  const eventMatches = events.filter(e => `${e.title} ${e.description} ${e.location}`.toLowerCase().includes(normalized.split(/\s+/).find(w => w.length > 3) || "___"));
  let answer = "I can help with Benevolent MIDAX information, but I could not find a published answer in the current application knowledge. Try asking about the Constitution, support, contributions, news, events, resources or portal navigation.";
  if (matches.length) answer = `Here is a relevant published update: ${matches[0].title}. ${matches[0].summary || "Open the News page for the full update."}`;
  else if (eventMatches.length) answer = `A matching upcoming event is ${eventMatches[0].title}${eventMatches[0].location ? ` at ${eventMatches[0].location}` : ""}. It starts ${new Date(eventMatches[0].startAt).toLocaleString()}.`;
  else if (normalized.includes("constitution")) answer = "The Constitution is available from the public Constitution page and the Resource Centre. It is the authoritative source for governance and benefit rules.";
  else if (normalized.includes("support") || normalized.includes("claim")) answer = role === "public" ? "The public site explains the scheme's support services. Members can submit and track requests from the Support area after signing in." : "Open Support in your portal to submit or track a support request.";
  else if (normalized.includes("document") || normalized.includes("resource")) answer = "Open the Resource Centre for published Constitution files, forms, guides and other documents.";
  res.json({ success: true, answer, source: "application" });
};

exports.assistantContext = async (req, res) => {
  const role = req.userRole || "public";
  const [website, news, events] = await Promise.all([
    News.find({ published: true, status: "published" }).sort({ publishDate: -1 }).limit(8).select("title summary category publishDate").lean(),
    Event.find({ published: true, audience: role === "public" ? "member" : role, startAt: { $gte: new Date(Date.now() - 86400000) } }).sort({ startAt: 1 }).limit(8).select("title description type startAt location").lean().catch(() => []),
    Promise.resolve([]),
  ]);
  res.json({ success: true, context: { role, service: "Benevolent Midax", news: website, events } });
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
