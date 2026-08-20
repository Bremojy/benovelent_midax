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


const ASSISTANT_KNOWLEDGE = [
  ["greeting", /^(hi|hello|hey|good morning|good afternoon|good evening)\b/i, "Hello! Welcome to Benevolent MIDAX. I can guide you through the website and the secure portals."],
  ["identity", /\b(who are you|what can you do|help)\b/i, "I’m the Benevolent Assistant. I explain published website information and guide you to the right portal section without exposing private member records."],
  ["contribution", /\b(contribution|monthly contribution|pay|deduction|500)\b/i, "The website currently describes the member contribution as Ksh 500. Use Accounts for your current records; the Constitution remains the source of truth for scheme rules."],
  ["funeral", /\b(funeral|death|burial)\b/i, "The public Services page describes Ksh 100,000 for an eligible funeral claim and Ksh 30,000 for qualifying sibling funeral expenses, subject to the Constitution and claim conditions."],
  ["medical", /\b(medical|hospital|inpatient)\b/i, "Medical support is available subject to the Constitution’s inpatient bands, family eligibility and claim conditions. Members can use Support or Claims after signing in."],
  ["education", /\b(education|school|school fees|children)\b/i, "Education support is described as coming soon. The website does not invent an amount; use official scheme updates when the benefit becomes active."],
  ["constitution", /\b(constitution|governance|rules|policy)\b/i, "Open Constitution to read, view, download or print the official scheme rules. The Constitution is the authoritative source for governance and benefit procedures."],
  ["about", /\b(about|history|midax company|why benevolent)\b/i, "The About page explains Midax Petroleum Marketing, the Benevolent scheme’s purpose, member voice, accountability, representatives and communication."],
  ["services", /\b(services|benefits|support services)\b/i, "Services covers Funeral Support, Medical Support, Education Support coming soon, accountability and Constitution-led decisions."],
  ["news", /\b(news|announcement|announcements|update|newsroom)\b/i, "Open News for published updates, upcoming activities, resources and community polls. Signed-in users also receive portal notifications."],
  ["resources", /\b(resource|resources|document|documents|forms|guides)\b/i, "Open Resource Centre or the Resources section of News for published forms, guides and official documents."],
  ["contact", /\b(contact|phone|email|whatsapp|location|nairobi)\b/i, "Open Contact for the official enquiry form and current scheme contact information. The public page lists Nairobi, Kenya as the location."],
  ["login", /\b(login|log in|sign in|access portal|password)\b/i, "Use Login to enter the secure portal. Member, admin and superadmin accounts see role-specific tools. Keep credentials private."],
  ["member", /\b(member portal|member dashboard|member account)\b/i, "The member portal includes Profile, Dependants, Accounts, Support, Claims, Messages, Notifications, News/Announcements, Polls and Settings."],
  ["admin", /\b(admin portal|administrator|admin dashboard)\b/i, "The admin portal provides authorised operational tools for members, accounts, support and claims, messages, notifications and other administrator functions."],
  ["superadmin", /\b(superadmin|super admin|super administrator)\b/i, "The superadmin portal provides higher-level administration, system, audit and data-integrity controls plus member/admin management, messages, notifications, news and settings."],
  ["profile", /\b(profile|profile photo|photo|account details|bio)\b/i, "Open Profile to review or update your account details and profile photo. Complete required fields to unlock the full portal experience."],
  ["dependants", /\b(dependant|dependants|dependent|family|spouse|parent)\b/i, "Open Dependants to manage eligible family records used by support and claims processes."],
  ["accounts", /\b(accounts|ledger|contribution history|balance)\b/i, "Open Accounts for contribution records and scheme account information available to your role. Figures are server-provided system records."],
  ["support", /\b(support request|support|claim|assistance|submit support)\b/i, "Open Support or Claims, choose the relevant request type, provide the required details and supporting documents, then track the request from the portal."],
  ["chat", /\b(chat|message|messages|messaging|conversation)\b/i, "Open Messages to search members, start private conversations, send messages and use audio/video calling where supported."],
  ["call", /\b(audio call|voice call|video call|calling|call someone)\b/i, "Messages supports browser audio and video calls using WebRTC. Both users need a live connection and browser permission for the required microphone/camera."],
  ["ringtone", /\b(ringtone|incoming call sound|call sound)\b/i, "Incoming calls use the Benevolent call ringtone shipped with the website. Browser/device notification and sound permissions must be allowed for the most reliable alerts."],
  ["notification", /\b(notification|notifications|bell|alert)\b/i, "Use Notifications and the bell icon for portal updates. Browser push notifications require permission and can also alert you to incoming calls."],
  ["poll", /\b(poll|vote|voting)\b/i, "Open Polls to view active community questions and vote when eligible. Published poll results can appear on News."],
  ["install", /\b(install|android|iphone|pwa|home screen|app)\b/i, "The site is installable as a PWA on supported browsers. Use the Install action or your browser’s Install App/Add to Home Screen option."],
  ["privacy", /\b(privacy|private|security|personal data)\b/i, "Open Privacy Policy for privacy guidance. Member information, support requests, dependants and portal activity are intended for authorised access only."],
  ["terms", /\b(terms|conditions|rules for using)\b/i, "Open Terms & Conditions for the rules governing responsible use of the website and portals and the requirement to protect login credentials."],
  ["logout", /\b(logout|log out|sign out)\b/i, "Use the account menu and choose Logout. Portal credentials are kept only for the current browser tab, not as a persistent browser login."],
  ["same computer", /\b(another phone|other phone|new device|same laptop|same computer|two accounts)\b/i, "Each browser tab keeps its own portal session, so different authorised accounts can be used on the same computer without sharing login credentials."],
];

const tokenise = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2);
const bestKnowledgeAnswer = (question) => {
  const normalized = String(question || "").trim();
  if (!normalized) return null;
  const exact = ASSISTANT_KNOWLEDGE.find(([, pattern]) => pattern.test(normalized));
  return exact?.[2] || null;
};

exports.assistant = async (req, res) => {
  const question = String(req.body?.question || "").trim();
  if (!question) return res.status(400).json({ success: false, message: "Question is required." });
  const role = req.userRole || "public";

  const [news, events, website, resources] = await Promise.all([
    News.find({ published: true, status: "published" }).sort({ publishDate: -1 }).limit(20).select("title summary category content publishDate").lean(),
    Event.find({ published: true, startAt: { $gte: new Date(Date.now() - 86400000 * 30) }, ...(role !== "public" ? { audience: role } : {}) }).sort({ startAt: 1 }).limit(20).select("title description type startAt location audience").lean(),
    WebsiteContent.find({ published: true, section: { $in: ["home", "about", "services", "contact", "footer", "settings", "gallery", "constitution", "privacy-policy", "terms-conditions", "news", "events", "resources", "chatbot"] } }).select("section title subtitle description content").lean(),
    (async () => {
      const publicRoot = path.join(__dirname, "..", "..", "public", "documents");
      try { return fs.readdirSync(publicRoot).filter((name) => /\.(pdf|docx?|xlsx?|pptx?)$/i.test(name)).slice(0, 50); } catch (_) { return []; }
    })(),
  ]);

  const normalized = question.toLowerCase();
  const tokens = tokenise(question);
  const publishedMatches = news.filter((item) => tokens.some((token) => `${item.title || ""} ${item.summary || ""} ${item.category || ""} ${item.content || ""}`.toLowerCase().includes(token)));
  const eventMatches = events.filter((item) => tokens.some((token) => `${item.title || ""} ${item.description || ""} ${item.location || ""}`.toLowerCase().includes(token)));

  const knowledgeAnswer = bestKnowledgeAnswer(question);
  let answer = knowledgeAnswer;
  if (!answer && publishedMatches.length) answer = `A published update that matches your question is “${publishedMatches[0].title}”. ${publishedMatches[0].summary || "Open News for the full update."}`;
  else if (!answer && eventMatches.length) answer = `A matching activity is “${eventMatches[0].title}”${eventMatches[0].location ? ` at ${eventMatches[0].location}` : ""}. It starts ${new Date(eventMatches[0].startAt).toLocaleString()}.`;
  else if (!answer && (normalized.includes("resource") || normalized.includes("document"))) answer = `The Resource Centre currently lists ${resources.length} published document${resources.length === 1 ? "" : "s"}. Open Resources to view them.`;
  else if (!answer) answer = role === "public"
    ? "I can help with the published Benevolent MIDAX website and current public updates. Try asking about the Constitution, services, contributions, funeral or medical support, news, events, resources, contact details, login or the public website."
    : "I can help with the published Benevolent MIDAX website and your authorised portal navigation. Try asking about Profile, Dependants, Accounts, Support, Claims, Messages, Notifications, Calls, Polls, News, Resources or the Constitution.";

  // Optional server-side language provider remains grounded by the same knowledge
  // and is never exposed as a user-facing feature name.
  const providerUrl = String(process.env.ASSISTANT_PROVIDER_URL || process.env.AI_API_URL || "").trim();
  const providerKey = String(process.env.ASSISTANT_PROVIDER_KEY || process.env.AI_API_KEY || "").trim();
  const providerModel = String(process.env.ASSISTANT_MODEL || process.env.AI_MODEL || "").trim();
  if (providerUrl && providerKey && providerModel && typeof fetch === "function") {
    try {
      const context = JSON.stringify({ service: "Benevolent MIDAX", role, website, news, events, resources, applicationGuidance: ASSISTANT_KNOWLEDGE.map(([name, , text]) => ({ name, text })) });
      const response = await fetch(providerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${providerKey}` },
        body: JSON.stringify({ model: providerModel, messages: [
          { role: "system", content: `You are the Benevolent MIDAX website assistant. Answer only from the supplied application context. Respect the portal role. Never reveal private member data. If the answer is not in context, say so and direct the user to the appropriate page. Context: ${context}` },
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
