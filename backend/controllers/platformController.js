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
  ["identity", /\b(who are you|what can you do|help|assistant|benovelent|benevolent midax)\b/i, "I’m the Benevolent MIDAX Assistant. I’m here to give clear, human-friendly guidance about the website, membership, scheme benefits, portal features and where to find the right information. I won’t invent private records or official rules."],
  ["greeting", /\b(hello|hi|hey|good morning|good afternoon|good evening|how are you)\b/i, "Hello and welcome to Benevolent MIDAX. Tell me what you would like to know or what you are trying to do, and I’ll guide you step by step."],
  ["membership", /\b(join|membership|become a member|member registration|register as a member|who can join)\b/i, "Membership is managed through the scheme’s authorised process. When an administrator creates your account, you receive a Benovelent MIDAX Number (for example BM001) and login credentials. Your profile should then be completed fully and verified before restricted member services are unlocked."],
  ["member number", /\b(member number|membership number|benovelent midax number|benevolent midax number|bm\d{3,})\b/i, "Your Benovelent MIDAX Number is your permanent membership identifier, such as BM001. It is assigned to your member account and is not meant to be changed later."],
  ["profile completion", /\b(profile.*100|100% profile|complete my profile|profile completion|finish profile|missing profile details)\b/i, "Complete every required profile item, upload the requested documents, and accept the required declarations. When your profile reaches 100%, the system marks your account as waiting for verification and notifies the member, Admin and Super Admin. Restricted services become available after verification."],
  ["verification", /\b(verify|verification|verified|verification pending|pending verification|approve member|verify member)\b/i, "After a member reaches 100% profile completion, the account enters Verification Pending. An authorised Admin or Super Admin can open Member Administration and choose Verify Member. Once verified, the member can use restricted services such as Dependants and Support, subject to their account status."],
  ["position", /\b(position|job title|role at work|occupation|designation)\b/i, "The member profile uses Position to record the member’s work position. It is the same kind of information an Admin or Super Admin records when creating a member account; the old Occupation field is no longer the member profile field."],
  ["contribution", /\b(contribution|monthly contribution|pay contribution|how much.*contribution|500|five hundred)\b/i, "The website currently presents the monthly member contribution as Ksh 500. Your portal’s Accounts/Contributions area is the best place to see the records stored for your account, while the Constitution remains the authority for scheme rules."],
  ["funeral", /\b(funeral|death|burial|bereavement)\b/i, "Funeral support is one of the scheme benefits presented on the website. Claim eligibility, amounts, qualifying relatives and supporting documents are governed by the Constitution and the current claim process, so check the relevant Support/Claims page before submitting."],
  ["medical", /\b(medical|hospital|inpatient|treatment|sick)\b/i, "Medical support is available through the scheme process for eligible cases. Amounts and conditions depend on the Constitution, qualifying treatment and the member/family circumstances recorded by the scheme."],
  ["education", /\b(education|school fees|school support|college|university)\b/i, "Education support is presented as a planned/coming-soon area when it is not activated in the current website content. The assistant will not invent an amount; use the latest official scheme communication and Constitution when the benefit is active."],
  ["constitution", /\b(constitution|rules|governance|bylaws|policy|scheme rules)\b/i, "The Constitution is the authoritative source for governance, eligibility, benefit conditions and scheme procedures. Open Constitution to read, download or print the official document."],
  ["about", /\b(about|history|purpose|why benevolent midax|midax petroleum)\b/i, "The About section explains the relationship between Midax Petroleum Marketing and the Benevolent scheme, its purpose, member voice, accountability and communication."],
  ["services", /\b(services|benefits|what benefits|what support|scheme benefits)\b/i, "The public Services section explains the scheme’s support areas, including Funeral Support, Medical Support and the Education Support area when activated, together with Constitution-led procedures and accountability."],
  ["news", /\b(news|announcement|announcements|updates|latest update|newsroom)\b/i, "Open News to see published announcements, activities, resources and community updates. Some updates may also appear as notifications inside the portal."],
  ["events", /\b(event|events|calendar|activity|activities|meeting|meetings)\b/i, "Open the Events or News area to see published activities. Visibility depends on the audience configured by the scheme administrators."],
  ["resources", /\b(resource|resources|document|documents|form|forms|guide|guides|download)\b/i, "The Resource Centre contains published forms, guides and official documents. The Constitution and other public documents can be opened, downloaded or printed where available."],
  ["contact", /\b(contact|phone number|email address|whatsapp|office|location|where are you|nairobi)\b/i, "Open Contact for the official enquiry channels and location information. Do not send passwords, one-time codes or private documents through an unverified channel."],
  ["login", /\b(login|log in|sign in|access portal|portal access|username|password)\b/i, "Use Login to enter the secure portal with the credentials issued for your account. Keep your password private and change temporary credentials when prompted."],
  ["member portal", /\b(member portal|member dashboard|what can members do|member features)\b/i, "The member portal provides Profile, Dependants, Accounts/Contributions, Support, Claims, Messages, Notifications, News/Announcements, Polls and Settings according to account status and verification."],
  ["admin portal", /\b(admin portal|admin dashboard|administrator|admin features)\b/i, "The Admin portal provides authorised administration tools such as Member Administration, support/claims, accounts and finance, messages, notifications, news and operational controls."],
  ["superadmin portal", /\b(superadmin|super admin|super administrator|superadmin portal)\b/i, "The Super Admin portal provides higher-level administration, audit, data-integrity, member/admin management, messages, notifications, website/news settings and other restricted system controls."],
  ["dependants", /\b(dependant|dependants|dependent|dependents|spouse|children|child|parent|family members)\b/i, "Use Dependants to manage eligible family records used by support and claims. Dependants are available after the member account has completed verification and any other required status checks."],
  ["support", /\b(support request|support|assistance|apply for support|request assistance)\b/i, "Open Support, choose the appropriate support type, provide the required information and attach valid supporting documents. A verified member account is required for restricted support submission."],
  ["claims", /\b(claim|claims|claim status|track claim|claim tracking|request status)\b/i, "Open Claims or Support to submit or follow a request. The portal shows the status and timeline available for your account. Keep any claim/reference information shown by the system."],
  ["documents upload", /\b(upload|attachment|supporting documents|document upload|passport|national id|signature)\b/i, "For profile and claim forms, upload clear documents in the requested fields. Make sure the file matches the requested document type and is readable before submitting."],
  ["accounts", /\b(accounts|ledger|balance|contribution history|financial records|finance)\b/i, "Member Accounts/Contributions and authorised Finance pages show the records stored by the system. Where figures matter, treat the live portal and official scheme records as the source of truth."],
  ["chat", /\b(chat|message|messages|messaging|conversation|text someone)\b/i, "Open Messages to find authorised members or colleagues, start private conversations and exchange messages. Your own account is hidden from the chat directory so you cannot message yourself."],
  ["audio video calls", /\b(audio call|voice call|video call|video calling|call someone|calling|webcam)\b/i, "Messages supports browser audio and video calling. Both participants need a reliable internet connection, and the browser must allow microphone access for audio or microphone plus camera access for video. If a call cannot connect, check browser permissions and network restrictions first."],
  ["notifications", /\b(notification|notifications|push|bell|alert|alerts)\b/i, "Use Notifications and the bell icon for portal updates. Browser push alerts require permission. Verification requests, incoming calls and important system events can be surfaced through the notification system when supported."],
  ["calls permissions", /\b(camera permission|microphone permission|allow camera|allow microphone|camera not working|mic not working)\b/i, "For audio calls, allow microphone access. For video calls, allow both microphone and camera. If permission was previously denied, open the browser’s site permissions for Benevolent MIDAX, allow the devices and retry."],
  ["pwa", /\b(app|install|install app|android|iphone|home screen|pwa|phone)\b/i, "The website is installable as a Progressive Web App on supported browsers. Use the site’s Install prompt or your browser’s Install App/Add to Home Screen option."],
  ["polls", /\b(poll|polls|vote|voting|questionnaire)\b/i, "Open Polls to see active community questions and vote when your account is eligible. Published results may also appear in News."],
  ["feedback", /\b(feedback|survey|review|questionnaire|feedback collection)\b/i, "Use Feedback to complete any published collection. Some collections can be marked required by administrators, so finish all required questions before submitting."],
  ["privacy security", /\b(privacy|security|secure|personal data|private information|data protection)\b/i, "Open Privacy Policy for the public privacy guidance. Never share passwords, authentication codes or private member records with the assistant or another user. Access to portal data is role-restricted."],
  ["terms", /\b(terms|terms and conditions|conditions|acceptable use)\b/i, "Open Terms & Conditions for the rules that govern responsible use of the website and portals."],
  ["forgot password", /\b(forgot password|reset password|password reset|change password|temporary password)\b/i, "Use the password controls available in the portal. If an administrator created your account with a temporary password, change it as soon as the portal requests. Never disclose a password to the assistant."],
  ["logout", /\b(logout|log out|sign out)\b/i, "Use the account menu and choose Logout when you finish. For shared devices, always sign out and avoid saving passwords in a browser used by other people."],
  ["multiple devices", /\b(another phone|other phone|new device|same computer|same laptop|two accounts|multiple accounts|logged in elsewhere)\b/i, "For security, a successful login can replace an older server session for the same account. On a shared computer, use separate authorised accounts carefully and always sign out when finished."],
  ["browser", /\b(browser|chrome|edge|firefox|safari|supported browser)\b/i, "Use a current version of Chrome, Edge, Firefox or Safari. Camera, microphone, push notifications and PWA installation depend on what the browser and operating system support."],
  ["errors", /\b(error|errors|blank page|not working|broken|failed|failure|500|404)\b/i, "First refresh once after a new deployment and make sure the browser has the latest site version. Then follow the visible error message and retry once. For account-specific issues, use the official Contact/support channel rather than repeatedly submitting the same failed request."],
  ["admin add member", /\b(add member|create member|register member|invite member|new member)\b/i, "Authorised Admin/Super Admin users create members from Member Administration. The member record uses a permanent Benovelent MIDAX Number such as BM001, along with the member’s name, phone, email, department and position. The invitation includes the member email and login details."],
  ["invitation", /\b(invitation|invite|member invite|login credentials|credentials email)\b/i, "A member invitation contains the Benovelent MIDAX Number, member email, username/login identifier and temporary password. The member should change the temporary password immediately and never share it."],
  ["verification public", /\b(verify membership|membership verification|public verification)\b/i, "The public membership verification area can be used where enabled to check an official membership verification result. Do not use it to guess or expose private member information."],
  ["public pages", /\b(what pages|website sections|public website|website pages|where can i find)\b/i, "The public site includes Home, About, Services, News, Polls, Leaders, Gallery, Events, Resources, Constitution, Contact, Privacy Policy, Terms & Conditions, Disclaimer and membership verification where enabled."],
  ["human help", /\b(i do not understand|dont understand|do not know|explain again|simplify|what should i do|what do i do next|step by step)\b/i, "No problem. Tell me what you are trying to achieve in one sentence, for example “I want to add my children” or “my profile is 100% but I cannot submit support”. I’ll give you the simplest next steps without using technical language."],
]

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
